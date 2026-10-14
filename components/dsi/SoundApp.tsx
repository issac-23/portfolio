'use client'

import Image from 'next/image'
import { AppLower } from './screen'
import { useNowPlaying } from '../useNowPlaying'

// The box size lives in CSS, so it can change per screen size; `size` is
// only the intrinsic size handed to next/image.
function Art({ src, size, big }: { src?: string; size: number; big?: boolean }) {
  const cls = `dsi-art ${big ? 'dsi-art-big' : 'dsi-art-small'}`
  if (!src) return <span className={`${cls} dsi-art-empty`} aria-hidden="true">♪</span>
  return (
    <span className={cls}>
      <Image src={src} alt="" width={size} height={size} />
    </span>
  )
}

/** Upper screen: what's on right now, or the last thing that was. */
export function NowPlayingCard() {
  const s = useNowPlaying()

  if (s.kind === 'loading') return <p className="dsi-sound-note">Tuning in…</p>
  if (s.kind === 'unreachable') return <p className="dsi-sound-note">Couldn&apos;t reach Spotify just now.</p>
  if (s.kind === 'nothing') return <p className="dsi-sound-note">Nothing playing right now.</p>

  const t = s.track
  return (
    <div className="dsi-sound">
      <Art src={t.albumImageUrl} size={96} big />
      <div className="dsi-sound-text">
        <span className="dsi-sound-state">
          {s.kind === 'playing' ? (
            <>
              <span className="dsi-bars" aria-hidden="true"><i /><i /><i /></span>
              Now playing
            </>
          ) : (
            'Last played'
          )}
        </span>
        <h2>{t.title}</h2>
        <span>{t.artist}</span>
        <span className="dsi-sub">{t.album}</span>
      </div>
    </div>
  )
}

/** Lower screen: recently played, each one a link out to Spotify. */
export function RecentlyPlayed({ onBack }: { onBack: () => void }) {
  const s = useNowPlaying()
  const playing = s.kind === 'playing' ? s.track : undefined
  const recent = s.kind === 'playing' || s.kind === 'last' ? s.recent : []

  return (
    <AppLower
      onBack={onBack}
      actions={[
        playing?.songUrl
          ? { label: 'Spotify', name: `${playing.title} on Spotify (new tab)`, href: playing.songUrl, primary: true }
          : { label: 'Spotify', unavailable: 'Not playing' },
      ]}
    >
      {recent.length ? (
        <ul className="dsi-tracks" aria-label="Recently played">
          {recent.map(t => (
            <li key={`${t.title}|${t.artist}`}>
              <a className="dsi-card" href={t.songUrl} target="_blank" rel="noopener noreferrer">
                <Art src={t.albumImageUrl} size={30} />
                <span className="dsi-card-text">
                  <b>{t.title}</b>
                  <span>{t.artist}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dsi-sound-note">
          {playing ? 'Recently played shows up once the music stops.' : 'No recent plays to show.'}
        </p>
      )}
    </AppLower>
  )
}
