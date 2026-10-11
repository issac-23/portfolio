'use client'

import Image from 'next/image'
import { AppLower } from './screen'
import { dedupe, useNowPlaying, type Track } from './useNowPlaying'

function Art({ src, size }: { src?: string; size: number }) {
  if (!src) return <span className="dsi-art dsi-art-empty" style={{ width: size, height: size }} aria-hidden="true">♪</span>
  return (
    <span className="dsi-art" style={{ width: size, height: size }}>
      <Image src={src} alt="" width={size} height={size} />
    </span>
  )
}

/** Upper screen: what's on right now, or the last thing that was. */
export function NowPlayingCard() {
  const s = useNowPlaying()

  if (s.status === 'loading') return <p className="dsi-sound-note">Tuning in…</p>
  if (s.status === 'failed') return <p className="dsi-sound-note">Couldn&apos;t reach Spotify just now.</p>

  const d = s.data
  const last = d.recentTracks?.[0]
  const t = d.isPlaying && d.title ? { title: d.title, artist: d.artist ?? '', album: d.album ?? '', albumImageUrl: d.albumImageUrl ?? '' } : last

  if (!t) return <p className="dsi-sound-note">Nothing playing right now.</p>

  return (
    <div className="dsi-sound">
      <Art src={t.albumImageUrl} size={96} />
      <div className="dsi-sound-text">
        <span className="dsi-sound-state">
          {d.isPlaying ? (
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
  const d = s.status === 'ready' ? s.data : undefined
  const recent: Track[] = dedupe(d?.recentTracks ?? [])

  return (
    <AppLower
      onBack={onBack}
      actions={[
        d?.isPlaying && d.songUrl
          ? { label: 'Spotify', name: `${d.title} on Spotify (new tab)`, href: d.songUrl, primary: true }
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
          {d?.isPlaying ? 'Recently played shows up once the music stops.' : 'No recent plays to show.'}
        </p>
      )}
    </AppLower>
  )
}
