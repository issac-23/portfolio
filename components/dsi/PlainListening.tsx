'use client'

import { useNowPlaying } from '../useNowPlaying'

/** The Sound app as a sentence and a short list. */
export default function PlainListening() {
  const s = useNowPlaying()
  if (s.kind === 'loading') return <p>Checking Spotify…</p>
  if (s.kind === 'unreachable') return <p>Couldn&apos;t reach Spotify just now.</p>
  if (s.kind === 'nothing') return <p>Nothing playing right now.</p>

  return (
    <>
      {s.kind === 'playing' && (
        <p>
          Now playing:{' '}
          <a href={s.track.songUrl} target="_blank" rel="noopener noreferrer">{s.track.title}</a> by {s.track.artist}
        </p>
      )}
      {s.recent.length > 0 && (
        <>
          <p>Recently played:</p>
          <ul>
            {s.recent.map(t => (
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
