const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export interface WeekTrack {
  title: string
  artist: string
  album: string
  albumImageUrl: string
  songUrl: string
}

export interface Week {
  since: string
  plays: number
  topTracks: (WeekTrack & { plays: number })[]
  topArtists: { name: string; plays: number; imageUrl: string }[]
}

export function toTrack(item: any): WeekTrack {
  const t = item.track
  return {
    title: t.name ?? '',
    artist: (t.artists ?? []).map((a: any) => a.name).join(', '),
    album: t.album?.name ?? '',
    albumImageUrl: t.album?.images?.[0]?.url ?? '',
    songUrl: t.external_urls?.spotify ?? '',
  }
}

/** Local files and removed tracks come back with a null track. */
export function playable(items: any[]): any[] {
  return items.filter(item => item?.track)
}

/**
 * The refresh token can't read Spotify's top-items endpoints, so "the week"
 * is counted from the last 50 recent plays (the most the API returns).
 * Anything older than seven days is ignored; ties go to whoever was played
 * most recently.
 */
export function aggregateWeek(items: any[], now = Date.now()): Week {
  const since = now - WEEK_MS
  const counted = playable(items)
    .map(item => ({ item, at: Date.parse(item.played_at) }))
    .filter(p => p.at >= since && p.at <= now)
    .sort((a, b) => b.at - a.at)

  const tracks = new Map<string, { track: WeekTrack; plays: number; last: number }>()
  const artists = new Map<string, { name: string; plays: number; last: number; imageUrl: string }>()

  for (const { item, at } of counted) {
    const track = toTrack(item)
    const trackKey = `${track.title}|${track.artist}`
    const t = tracks.get(trackKey)
    if (t) t.plays++
    else tracks.set(trackKey, { track, plays: 1, last: at })

    // Newest first, so the first time an artist shows up is their latest
    // counted play and its album art is the one to keep.
    const name: string = item.track.artists?.[0]?.name ?? ''
    if (!name) continue
    const a = artists.get(name)
    if (a) a.plays++
    else artists.set(name, { name, plays: 1, last: at, imageUrl: track.albumImageUrl })
  }

  const byPlays = (a: { plays: number; last: number }, b: { plays: number; last: number }) =>
    b.plays - a.plays || b.last - a.last

  return {
    since: new Date(since).toISOString(),
    plays: counted.length,
    topTracks: Array.from(tracks.values())
      .sort(byPlays)
      .slice(0, 5)
      .map(t => ({ ...t.track, plays: t.plays })),
    topArtists: Array.from(artists.values())
      .sort(byPlays)
      .slice(0, 3)
      .map(a => ({ name: a.name, plays: a.plays, imageUrl: a.imageUrl })),
  }
}
