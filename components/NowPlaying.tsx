'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface NowPlayingData {
  isPlaying: boolean
  title?: string
  artist?: string
  album?: string
  albumImageUrl?: string
  songUrl?: string
  recentTracks?: RecentTrack[]
}

interface RecentTrack {
  title: string
  artist: string
  album: string
  albumImageUrl: string
  songUrl: string
}

function MusicBars() {
  return (
    <span className="inline-flex items-end gap-[2px]" style={{ height: '14px' }}>
      {[0.55, 1, 0.7].map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-accent animate-pulse"
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.9s',
          }}
        />
      ))}
    </span>
  )
}

export default function NowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null)
  const [loading, setLoading] = useState(true)
  const ref = useRef<HTMLElement>(null)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/spotify/now-playing')
      const json = await res.json()
      setData(json)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="music" ref={ref} className="section-fade py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

          <div>
            <span className="text-xs text-accent tracking-widest uppercase font-medium">Music</span>
            <h2
              className="text-3xl text-fg mt-3"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              What I&apos;m Listening To
            </h2>
          </div>

          <div className="space-y-8">
            {/* Now Playing card */}
            <div className="bg-surface rounded-2xl p-6 border border-border">
              {loading ? (
                <div className="flex items-center gap-4 animate-pulse">
                  <div className="w-16 h-16 rounded-xl flex-shrink-0" style={{ background: 'var(--surface-2)' }} />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 rounded" style={{ background: 'var(--surface-2)' }} />
                    <div className="h-3 w-24 rounded" style={{ background: 'var(--surface-2)' }} />
                  </div>
                </div>
              ) : data?.isPlaying ? (
                <a
                  href={data.songUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 group"
                >
                  {data.albumImageUrl && (
                    <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image src={data.albumImageUrl} alt={data.album ?? ''} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MusicBars />
                      <span className="text-xs text-accent font-medium">Now playing</span>
                    </div>
                    <p className="text-fg font-medium truncate group-hover:text-accent transition-colors">
                      {data.title}
                    </p>
                    <p className="text-muted text-sm truncate">{data.artist}</p>
                  </div>
                  <svg className="text-muted group-hover:text-accent transition-colors flex-shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </a>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-muted text-sm">Not playing right now</p>
                    {data?.recentTracks?.[0] && (
                      <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                        Last: {data.recentTracks[0].title}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recent tracks */}
            {!loading && (data?.recentTracks?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-muted uppercase tracking-widest mb-4">Recently played</p>
                <div className="space-y-4">
                  {data!.recentTracks!.slice(0, 5).map((track, i) => (
                    <a
                      key={i}
                      href={track.songUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 group"
                    >
                      <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image src={track.albumImageUrl} alt={track.album} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg truncate group-hover:text-accent transition-colors">
                          {track.title}
                        </p>
                        <p className="text-xs text-muted truncate">{track.artist}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
