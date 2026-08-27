'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { galleryPhotos } from '@/data/gallery'

export default function Gallery() {
  const [selected, setSelected] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const [imgReady, setImgReady] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.05 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const open = (i: number, el: HTMLButtonElement) => {
    triggerRef.current = el
    setImgReady(false)
    setSelected(i)
  }

  const close = useCallback(() => {
    setClosing(true)
    const ms =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')
      ) || 150
    setTimeout(() => {
      setSelected(null)
      setClosing(false)
      triggerRef.current?.focus()
    }, ms)
  }, [])

  const step = useCallback((delta: number) => {
    setImgReady(false)
    setSelected((cur) =>
      cur === null ? cur : (cur + delta + galleryPhotos.length) % galleryPhotos.length
    )
  }, [])

  // lock background scroll + trap focus while the lightbox is open
  useEffect(() => {
    if (selected === null) return

    const prevOverflow = document.body.style.overflow
    const prevPadding = document.body.style.paddingRight
    const gutter = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (gutter > 0) document.body.style.paddingRight = `${gutter}px`

    dialogRef.current?.querySelector<HTMLElement>('button')?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'ArrowRight') { step(1); return }
      if (e.key === 'ArrowLeft') { step(-1); return }
      if (e.key === 'Tab') {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>('button')
        if (!nodes || nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPadding
      window.removeEventListener('keydown', onKey)
    }
  }, [selected, close, step])

  const photo = selected === null ? null : galleryPhotos[selected]
  const isOpen = selected !== null && !closing

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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryPhotos.map((photo, i) => (
                  <button
                    key={photo.src}
                    onClick={(e) => open(i, e.currentTarget)}
                    className="w-full block overflow-hidden rounded-lg group cursor-zoom-in lift-card"
                    aria-label={`Open photo: ${photo.alt ?? photo.caption ?? `photo ${i + 1}`}`}
                  >
                    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                      <Image
                        src={photo.src}
                        alt={photo.alt ?? photo.caption ?? `Gallery photo ${i + 1}`}
                        fill
                        sizes="(max-width: 640px) 45vw, 200px"
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
      {selected !== null && photo && (
        <div
          className={`t-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 ${
            isOpen ? 'is-open' : 'is-closing'
          }`}
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={photo.alt ?? photo.caption ?? 'Gallery photo'}
            className={`t-modal relative max-w-4xl w-full ${isOpen ? 'is-open' : 'is-closing'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full" style={{ height: '80vh' }}>
              {!imgReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/40 text-xs tracking-widest uppercase t-skel">
                    Loading
                  </span>
                </div>
              )}
              <Image
                key={photo.src}
                src={photo.src}
                alt={photo.alt ?? photo.caption ?? 'Gallery photo'}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                priority
                onLoad={() => setImgReady(true)}
                className={`object-contain ${imgReady ? 't-skel-reveal' : 'opacity-0'}`}
              />
            </div>
            <div className="flex items-center justify-center gap-3 mt-3">
              {photo.caption && (
                <p className="text-center text-muted text-sm">{photo.caption}</p>
              )}
              <span className="text-white/30 text-xs tabular-nums">
                {selected + 1} / {galleryPhotos.length}
              </span>
            </div>
            <button
              onClick={() => step(-1)}
              className="absolute left-2 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-12 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all text-2xl w-10 h-10 flex items-center justify-center"
              aria-label="Previous photo"
            >
              ←
            </button>
            <button
              onClick={() => step(1)}
              className="absolute right-2 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-12 text-white/60 hover:text-white bg-black/30 hover:bg-black/50 rounded-full transition-all text-2xl w-10 h-10 flex items-center justify-center"
              aria-label="Next photo"
            >
              →
            </button>
            <button
              onClick={close}
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
