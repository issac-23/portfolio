'use client'

import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { profile } from '@/data/profile'
import { AppLower, useListNav } from './screen'
import { RESUME_PDF as PDF, loadResume } from './resumePdf'

// The PDF's own section headings, in order. They are what the booklet is
// for, so they are the contents page; if the resume gains a section, add it.
const CONTENTS = ['Education', 'Experience', 'Projects', 'Skills']

/** The resume, once pdf.js has it. Null while loading, and for good if it fails. */
function useResume() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  useEffect(() => {
    let live = true
    loadResume().then(d => live && setDoc(d))
    return () => {
      live = false
    }
  }, [])
  return doc
}

function Cover() {
  return (
    <div className="dsi-booklet">
      <span className="dsi-booklet-kicker">Instruction Booklet</span>
      <h2>{profile.name}</h2>
      <span className="dsi-sub">{profile.headline}</span>
    </div>
  )
}

/**
 * The page, drawn at the screen's width and the device's pixel density so
 * the text stays sharp, and left to scroll down the screen from there.
 */
function PagePreview({ doc, page }: { doc: PDFDocumentProxy; page: number }) {
  const box = useRef<HTMLAnchorElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  // Reserves the page's box before the first draw. Letter until the page says otherwise.
  const [ratio, setRatio] = useState(8.5 / 11)

  // Track the screen's width, settling for 150ms after the last change so a
  // window drag is one redraw rather than sixty.
  useEffect(() => {
    const el = box.current
    if (!el) return
    let timer: number | undefined
    const measure = () => setWidth(Math.floor(el.clientWidth))
    measure()
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 150)
    })
    ro.observe(el)
    return () => {
      window.clearTimeout(timer)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const el = canvas.current
    if (!el || !width) return
    let cancelled = false
    let task: { promise: Promise<unknown>; cancel: () => void } | undefined
    ;(async () => {
      try {
        const pg = await doc.getPage(page + 1)
        if (cancelled) return
        const base = pg.getViewport({ scale: 1 })
        setRatio(base.width / base.height)
        // Capped at 2: past that the backing store grows and nobody can tell.
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = pg.getViewport({ scale: (width / base.width) * dpr })
        // Drawn on a canvas of its own and copied over, so a redraw never
        // shows the visible one blank, and each render has a canvas to itself.
        const off = document.createElement('canvas')
        off.width = Math.floor(viewport.width)
        off.height = Math.floor(viewport.height)
        const context = off.getContext('2d')
        if (!context) return
        task = pg.render({ canvasContext: context, viewport })
        await task.promise
        if (cancelled) return
        el.width = off.width
        el.height = off.height
        el.getContext('2d')?.drawImage(off, 0, 0)
      } catch {
        // Cancelled by a newer render, or the page would not draw. Whatever
        // is on the canvas stays; there is nothing to report.
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, page, width])

  return (
    <a
      className="dsi-preview"
      href={PDF}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open resume (PDF, new tab)"
      style={{ aspectRatio: ratio }}
      ref={box}
    >
      <canvas ref={canvas} />
    </a>
  )
}

/**
 * Upper screen: the resume itself, once it has loaded. Until then, and if it
 * never does, the booklet's cover.
 */
export function BookletCover({ page = 0 }: { page?: number }) {
  const doc = useResume()
  return doc ? <PagePreview doc={doc} page={page} /> : <Cover />
}

interface BookletContentsProps {
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/** Lower screen: the contents, the pages when there are several, and the booklet itself. */
export function BookletContents({ selected, onSelect, onBack }: BookletContentsProps) {
  const pages = useResume()?.numPages ?? 0
  const list = useRef<HTMLUListElement>(null)
  // With one page there is no list: the arrow keys are left to scroll the preview.
  useListNav({ container: list, count: pages > 1 ? pages : 0, selected, onSelect })

  return (
    <AppLower
      onBack={onBack}
      actions={[
        { label: 'Read', name: 'Read resume (PDF, new tab)', href: PDF, external: true, primary: true },
        { label: 'Download', name: 'Download resume (PDF)', href: PDF, download: true, external: false },
      ]}
    >
      {pages > 1 && (
        <ul className="dsi-cards dsi-pages" ref={list} aria-label="Pages">
          {Array.from({ length: pages }, (_, i) => (
            <li key={i}>
              <button
                type="button"
                className="dsi-card"
                data-idx={i}
                data-sel={i === selected || undefined}
                aria-pressed={i === selected}
                tabIndex={i === selected ? 0 : -1}
                onFocus={() => onSelect(i)}
                onClick={() => onSelect(i)}
              >
                <span className="dsi-card-text">
                  <b>Page {i + 1}</b>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <ol className="dsi-contents" aria-label="Contents">
        {CONTENTS.map((c, i) => (
          <li key={c}>
            <span>{c}</span>
            <span aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
          </li>
        ))}
      </ol>
    </AppLower>
  )
}
