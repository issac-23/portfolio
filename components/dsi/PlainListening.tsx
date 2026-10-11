'use client'

import { dedupe, useNowPlaying } from './useNowPlaying'

/** The Sound app as a sentence and a short list. */
export default function PlainListening() {
  const s = useNowPlaying()
  if (s.status === 'loading') return <p>Checking Spotify…</p>
  if (s.status === 'failed') return <p>Couldn&apos;t reach Spotify just now.</p>

  const d = s.data
  const recent = dedupe(d.recentTracks ?? [])
  return (
    <>
      {d.isPlaying && d.title ? (
        <p>
          Now playing:{' '}
          <a href={d.songUrl} target="_blank" rel="noopener noreferrer">{d.title}</a> by {d.artist}
        </p>
      ) : (
        !recent.length && <p>Nothing playing right now.</p>
      )}
      {recent.length > 0 && (
        <>
          <p>Recently played:</p>
          <ul>
            {recent.map(t => (
              <li key={`${t.title}|${t.artist}`}>
                <a href={t.songUrl} target="_blank" rel="noopener noreferrer">{t.title}</a> by {t.artist}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
