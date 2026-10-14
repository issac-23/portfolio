'use client'

import Image from 'next/image'
import { plural } from './apps'
import { AppLower } from './screen'
import { useListeningWeek, useNowPlaying } from '../useNowPlaying'

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

/** Lower screen: the week's most played, then recently played, each song a link out to Spotify. */
export function SoundLists({ onBack }: { onBack: () => void }) {
  const s = useNowPlaying()
  const answer = useListeningWeek()
  const playing = s.kind === 'playing' ? s.track : undefined
  const recent = s.kind === 'playing' || s.kind === 'last' ? s.recent : []
  const week = answer && answer.plays > 0 ? answer : undefined

  return (
    <AppLower
      onBack={onBack}
      actions={[
        playing?.songUrl
          ? { label: 'Spotify', name: `${playing.title} on Spotify (new tab)`, href: playing.songUrl, primary: true }
          : { label: 'Spotify', unavailable: 'Not playing' },
      ]}
    >
      {/* While the first answer is out the lower screen stays quiet; the upper one says why. */}
      {s.kind === 'unreachable' && <p className="dsi-sound-note">No recent plays to show.</p>}
      {s.kind !== 'loading' && s.kind !== 'unreachable' && !week && (
        <p className="dsi-sound-note">No plays this week yet.</p>
      )}
      {week && (
        <>
          <h3 className="dsi-list-head">Top artists this week</h3>
          <ul className="dsi-tracks">
            {week.topArtists.slice(0, 3).map(a => (
              <li key={a.name}>
                <div className="dsi-card dsi-card-static">
                  <Art src={a.imageUrl} size={30} />
                  <span className="dsi-card-text">
                    <b>{a.name}</b>
                  </span>
                  <span className="dsi-card-status">{plural(a.plays, 'play', 'plays')}</span>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="dsi-list-head">Top songs this week</h3>
          <ul className="dsi-tracks">
            {week.topTracks.slice(0, 5).map(t => {
              // A local or partial item has no Spotify page, so it stays plain text.
              const inner = (
                <>
                  <Art src={t.albumImageUrl} size={30} />
                  <span className="dsi-card-text">
                    <b>{t.title}</b>
                    <span>{t.artist}</span>
                  </span>
                  <span className="dsi-card-status">{plural(t.plays, 'play', 'plays')}</span>
                </>
              )
              return (
                <li key={`${t.title}|${t.artist}`}>
                  {t.songUrl ? (
                    <a className="dsi-card" href={t.songUrl} target="_blank" rel="noopener noreferrer">{inner}</a>
                  ) : (
                    <div className="dsi-card dsi-card-static">{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
      {recent.length > 0 && (
        <>
          <h3 className="dsi-list-head">Recently played</h3>
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
        </>
      )}
    </AppLower>
  )
}
