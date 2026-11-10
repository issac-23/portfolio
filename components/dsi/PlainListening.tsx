'use client'

import { plural } from './apps'
import { externalProps } from '@/data/links'
import { useListeningWeek, useNowPlaying } from '../useNowPlaying'

/** The Sound app as a sentence and a short list. */
export default function PlainListening() {
  const s = useNowPlaying()
  const week = useListeningWeek()
  if (s.kind === 'loading') return <p>Checking Spotify…</p>
  if (s.kind === 'unreachable') return <p>Couldn&apos;t reach Spotify just now.</p>

  const recent = s.kind === 'nothing' ? [] : s.recent
  return (
    <>
      {s.kind === 'nothing' && <p>Nothing playing right now.</p>}
      {s.kind === 'playing' && (
        <p>
          Now playing:{' '}
          <a href={s.track.songUrl} {...externalProps(s.track.songUrl)}>{s.track.title}</a> by {s.track.artist}
        </p>
      )}
      {week.kind === 'week' ? (
        <>
          <p>Top artists this week:</p>
          <ul>
            {week.topArtists.map(a => (
              <li key={a.name}>{a.name}, {plural(a.plays, 'play', 'plays')}</li>
            ))}
          </ul>
          <p>Top songs this week:</p>
          <ul>
            {week.topTracks.map(t => (
              <li key={`${t.title}|${t.artist}`}>
                {t.songUrl ? (
                  <a href={t.songUrl} {...externalProps(t.songUrl)}>{t.title}</a>
                ) : (
                  t.title
                )}{' '}
                by {t.artist}, {plural(t.plays, 'play', 'plays')}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No plays this week yet.</p>
      )}
      {recent.length > 0 && (
        <>
          <p>Recently played:</p>
          <ul>
            {recent.map(t => (
              <li key={`${t.title}|${t.artist}`}>
                <a href={t.songUrl} {...externalProps(t.songUrl)}>{t.title}</a> by {t.artist}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
