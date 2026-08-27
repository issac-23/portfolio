'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { galleryPhotos } from '@/data/gallery'

export default function Gallery() {
  const [selected, setSelected] = useState<number | null>(null)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.05 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
      if (e.key === 'ArrowRight' && selected !== null)
        setSelected((selected + 1) % galleryPhotos.length)
      if (e.key === 'ArrowLeft' && selected !== null)
        setSelected((selected - 1 + galleryPhotos.length) % galleryPhotos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <>
      <section id="gallery" ref={ref} className="section-fade py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

            <div>
              <span className="text-xs text-accent tracking-widest uppercase font-medium">Gallery</span>
              <h2
                className="text-3xl text-fg mt-3"
                style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
              >
                Through My Lens
              </h2>
              <p className="text-muted text-sm mt-3 leading-relaxed">
                Moments that caught my eye.
              </p>
            </div>

            {galleryPhotos.length === 0 ? (
              <div
                className="rounded-2xl border border-dashed p-12 text-center"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <p className="text-muted text-sm">Photos coming soon.</p>
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  Add images to <code className="text-accent">/public/photos/gallery/</code> and update <code className="text-accent">data/gallery.ts</code>
                </p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {galleryPhotos.map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(i)}
                    className="w-full block overflow-hidden rounded-lg group cursor-zoom-in lift-card"
                    aria-label={`Open photo ${i + 1}`}
                  >
                    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                      <Image
                        src={photo.src}
                        alt={photo.alt ?? `Photo ${i + 1}`}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {selected !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl w-full animate-[lightboxIn_220ms_cubic-bezier(0.16,1,0.3,1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ height: '80vh' }}>
              <Image
                src={galleryPhotos[selected].src}
                alt={galleryPhotos[selected].alt ?? ''}
                fill
                className="object-contain"
              />
            </div>
            {galleryPhotos[selected].caption && (
              <p className="text-center text-muted text-sm mt-3">
                {galleryPhotos[selected].caption}
              </p>
            )}
            <button
              onClick={() => setSelected((selected - 1 + galleryPhotos.length) % galleryPhotos.length)}
              className="absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-12 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all text-2xl w-10 h-10 flex items-center justify-center"
              aria-label="Previous photo"
            >
              ←
            </button>
            <button
              onClick={() => setSelected((selected + 1) % galleryPhotos.length)}
              className="absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-12 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all text-2xl w-10 h-10 flex items-center justify-center"
              aria-label="Next photo"
            >
              →
            </button>
            <button
              onClick={() => setSelected(null)}
              className="absolute top-2 right-2 sm:top-0 sm:right-0 sm:-translate-y-10 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all w-10 h-10 flex items-center justify-center"
              aria-label="Close photo"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
