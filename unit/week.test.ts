import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { aggregateWeek } from '../app/api/spotify/now-playing/week'

const NOW = Date.parse('2026-06-10T12:00:00.000Z')
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/** A recently-played entry, played `ago` ms before NOW (negative = in the future). */
function play(title: string, artists: string[], ago: number, art = `${title}.jpg`) {
  return {
    played_at: new Date(NOW - ago).toISOString(),
    track: {
      name: title,
      artists: artists.map(name => ({ name })),
      album: { name: `${title} (Album)`, images: [{ url: art }] },
      external_urls: { spotify: `https://open.spotify.com/track/${title}` },
    },
  }
}

describe('aggregateWeek', () => {
  test('an empty list is an empty week', () => {
    const week = aggregateWeek([], NOW)
    assert.equal(week.plays, 0)
    assert.deepEqual(week.topTracks, [])
    assert.deepEqual(week.topArtists, [])
  })

  test('since is exactly seven days before now', () => {
    assert.equal(aggregateWeek([], NOW).since, new Date(NOW - 7 * DAY).toISOString())
  })

  describe('the seven day window', () => {
    test('keeps a play exactly seven days old and drops one a millisecond older', () => {
      const week = aggregateWeek(
        [play('Edge', ['A'], 7 * DAY), play('TooOld', ['A'], 7 * DAY + 1), play('Recent', ['A'], DAY)],
        NOW,
      )
      assert.equal(week.plays, 2)
      assert.deepEqual(week.topTracks.map(t => t.title).sort(), ['Edge', 'Recent'])
    })

    test('plays older than the window do not add to a track or artist count', () => {
      const week = aggregateWeek([play('Song', ['A'], DAY), play('Song', ['A'], 8 * DAY)], NOW)
      assert.equal(week.topTracks[0].plays, 1)
      assert.equal(week.topArtists[0].plays, 1)
    })
  })

  describe('the at <= now filter', () => {
    test('keeps a play at exactly now', () => {
      assert.equal(aggregateWeek([play('Now', ['A'], 0)], NOW).plays, 1)
    })

    test('drops a play dated after now', () => {
      const week = aggregateWeek([play('Future', ['A'], -1), play('Past', ['A'], HOUR)], NOW)
      assert.equal(week.plays, 1)
      assert.deepEqual(week.topTracks.map(t => t.title), ['Past'])
    })

    test('drops an entry whose played_at does not parse', () => {
      const bad = { ...play('Bad', ['A'], HOUR), played_at: 'not a date' }
      assert.equal(aggregateWeek([bad], NOW).plays, 0)
    })
  })

  describe('ranking', () => {
    test('more plays rank first', () => {
      const week = aggregateWeek(
        [play('One', ['A'], HOUR), play('Two', ['B'], 2 * HOUR), play('Two', ['B'], 3 * HOUR)],
        NOW,
      )
      assert.deepEqual(week.topTracks.map(t => [t.title, t.plays]), [['Two', 2], ['One', 1]])
      assert.deepEqual(week.topArtists.map(a => [a.name, a.plays]), [['B', 2], ['A', 1]])
    })

    test('a tie goes to the most recently played, whatever order the input is in', () => {
      // Both tracks and both artists have two plays. A was last played an hour
      // ago, B two hours ago, so A wins even though B's play comes first below.
      const items = [
        play('B-song', ['B'], 3 * HOUR),
        play('A-song', ['A'], 5 * HOUR),
        play('B-song', ['B'], 2 * HOUR),
        play('A-song', ['A'], HOUR),
      ]
      for (const input of [items, [...items].reverse()]) {
        const week = aggregateWeek(input, NOW)
        assert.deepEqual(week.topTracks.map(t => t.title), ['A-song', 'B-song'])
        assert.deepEqual(week.topArtists.map(a => a.name), ['A', 'B'])
      }
    })

    test('an older play does not move a track ahead in a tie', () => {
      // X's second play is 6 days old but still counts; Y's two plays are newer.
      const week = aggregateWeek(
        [play('X', ['X'], 6 * DAY), play('X', ['X'], HOUR), play('Y', ['Y'], 2 * HOUR), play('Y', ['Y'], 3 * HOUR)],
        NOW,
      )
      assert.deepEqual(week.topTracks.map(t => t.title), ['X', 'Y'])
    })

    test('keeps the top five tracks and the top three artists', () => {
      const items = Array.from({ length: 7 }, (_, i) => play(`Song${i}`, [`Artist${i}`], (i + 1) * HOUR))
      const week = aggregateWeek(items, NOW)
      assert.equal(week.plays, 7)
      assert.deepEqual(week.topTracks.map(t => t.title), ['Song0', 'Song1', 'Song2', 'Song3', 'Song4'])
      assert.deepEqual(week.topArtists.map(a => a.name), ['Artist0', 'Artist1', 'Artist2'])
    })
  })

  describe('null tracks', () => {
    test('local files and removed tracks are not counted', () => {
      const items = [
        { played_at: new Date(NOW - HOUR).toISOString(), track: null },
        { played_at: new Date(NOW - HOUR).toISOString() },
        null,
        play('Real', ['A'], 2 * HOUR),
      ]
      const week = aggregateWeek(items, NOW)
      assert.equal(week.plays, 1)
      assert.deepEqual(week.topTracks.map(t => t.title), ['Real'])
    })
  })

  describe('empty artist names', () => {
    test('the play and track count, but no artist entry is made', () => {
      const week = aggregateWeek(
        [play('Nameless', [''], HOUR), play('NoArtists', [], 2 * HOUR), play('Named', ['A'], 3 * HOUR)],
        NOW,
      )
      assert.equal(week.plays, 3)
      assert.equal(week.topTracks.length, 3)
      assert.deepEqual(week.topArtists.map(a => a.name), ['A'])
    })

    test('a track with no artists key at all does not throw', () => {
      const item = play('Bare', [], HOUR)
      delete (item.track as { artists?: unknown }).artists
      const week = aggregateWeek([item], NOW)
      assert.equal(week.plays, 1)
      assert.equal(week.topTracks[0].artist, '')
      assert.deepEqual(week.topArtists, [])
    })
  })

  describe('the title+artist key', () => {
    test('the same title by the same artist is one track', () => {
      const week = aggregateWeek([play('Ivy', ['Frank Ocean'], HOUR), play('Ivy', ['Frank Ocean'], 2 * HOUR)], NOW)
      assert.equal(week.topTracks.length, 1)
      assert.equal(week.topTracks[0].plays, 2)
    })

    test('the same title by a different artist is a separate track', () => {
      const week = aggregateWeek([play('Intro', ['A'], HOUR), play('Intro', ['B'], 2 * HOUR)], NOW)
      assert.equal(week.topTracks.length, 2)
    })

    test('the artist side of the key is every credited artist, in order', () => {
      const week = aggregateWeek(
        [play('Duet', ['A', 'B'], HOUR), play('Duet', ['A', 'B'], 2 * HOUR), play('Duet', ['A'], 3 * HOUR)],
        NOW,
      )
      assert.deepEqual(week.topTracks.map(t => [t.artist, t.plays]), [['A, B', 2], ['A', 1]])
    })

    test('artists are counted by their first credited name, whatever the track', () => {
      const week = aggregateWeek([play('One', ['A', 'B'], HOUR), play('Two', ['A'], 2 * HOUR)], NOW)
      assert.deepEqual(week.topArtists.map(a => [a.name, a.plays]), [['A', 2]])
    })
  })

  test('an artist keeps the album art of their most recent counted play', () => {
    const week = aggregateWeek(
      [play('Old', ['A'], 5 * HOUR, 'old.jpg'), play('New', ['A'], HOUR, 'new.jpg')],
      NOW,
    )
    assert.equal(week.topArtists[0].imageUrl, 'new.jpg')
  })

  test('the track fields come from the most recent play of that track', () => {
    const week = aggregateWeek([play('Ivy', ['A'], HOUR, 'new.jpg'), play('Ivy', ['A'], 2 * HOUR, 'old.jpg')], NOW)
    assert.equal(week.topTracks[0].albumImageUrl, 'new.jpg')
    assert.equal(week.topTracks[0].songUrl, 'https://open.spotify.com/track/Ivy')
  })

  test('defaults now to the current time', () => {
    const justNow = { ...play('Live', ['A'], 0), played_at: new Date(Date.now() - 1000).toISOString() }
    assert.equal(aggregateWeek([justNow]).plays, 1)
  })
})
