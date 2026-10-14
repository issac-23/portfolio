'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { isExternal } from '@/data/links'
import StatusBar from './StatusBar'

/**
 * The two halves every app screen is built from, so seven apps are one
 * layout with different content rather than seven bespoke pages.
 *
 * Top: the status bar, then the app's content. Bottom: a body that scrolls
 * inside the screen, never the page, over an action bar that always ends in
 * Back, the way the DSi kept its buttons along the bottom edge.
 */

export function AppTop({ children }: { children: ReactNode }) {
  return (
    <>
      <StatusBar user="Issac" />
      <div className="dsi-app-top">{children}</div>
    </>
  )
}

export interface Action {
  label: string
  /** Read out in place of the label, when the label alone is ambiguous. */
  name?: string
  href?: string
  /** Opens in a new tab. On by default for links off the site. */
  external?: boolean
  primary?: boolean
  /** Saves the file instead of opening it. */
  download?: boolean
  /**
   * Why the action is unavailable. A greyed button that says why beats a
   * dead link or a button that silently disappears.
   */
  unavailable?: string
  onClick?: () => void
}

function ActionButton({ action: a }: { action: Action }) {
  const cls = `dsi-action${a.primary ? ' dsi-action-go' : ''}`
  if (a.unavailable) {
    return <span className="dsi-action" aria-disabled="true">{a.unavailable}</span>
  }
  if (a.href) {
    const external = a.external ?? isExternal(a.href)
    return (
      <a
        className={cls}
        href={a.href}
        aria-label={a.name}
        download={a.download || undefined}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {a.label}
      </a>
    )
  }
  return (
    <button type="button" className={cls} aria-label={a.name} onClick={a.onClick}>
      {a.label}
    </button>
  )
}

interface AppLowerProps {
  children: ReactNode
  actions?: Action[]
  onBack: () => void
}

export function AppLower({ children, actions = [], onBack }: AppLowerProps) {
  const root = useRef<HTMLDivElement>(null)

  // The rail that had focus is gone once an app opens. A list inside takes
  // focus itself (its effect runs first); anything else lands on the first
  // control here, so the keyboard is never dropped back to the page.
  useEffect(() => {
    if (root.current?.contains(document.activeElement)) return
    root.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus({ preventScroll: true })
  }, [])

  // Escape is B: back out from anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.metaKey || e.ctrlKey || e.altKey) return
      e.preventDefault()
      onBack()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  return (
    <div className="dsi-lower dsi-app-lower" ref={root}>
      <div className="dsi-app-body">{children}</div>
      <div className="dsi-actions">
        {actions.map(a => <ActionButton key={a.label} action={a} />)}
        <button type="button" className="dsi-action" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  )
}

interface ListNavOptions {
  /** Holds the items, each marked with data-idx. */
  container: RefObject<HTMLElement>
  count: number
  selected: number
  onSelect: (index: number) => void
  /** More than one turns Left and Right on too, for a grid. */
  cols?: number
}

/**
 * Arrow keys over a list or grid: moves the selection, takes focus with it,
 * and scrolls the item into view inside the screen. Stops at the ends
 * rather than wrapping; these are lists, not the rail.
 *
 * Also lands focus on the selected item when the app opens, so the keyboard
 * carries straight on from the menu without a trip through the tab order.
 */
export function useListNav({ container, count, selected, onSelect, cols = 1 }: ListNavOptions) {
  const item = (i: number) => container.current?.querySelector<HTMLElement>(`[data-idx="${i}"]`)

  // Arrival only, and when the list first has something to focus: a list
  // that fills in late (the resume's pages) still gets it. Afterwards focus
  // moves with the user.
  const arrived = useRef(false)
  useEffect(() => {
    if (!count || arrived.current) return
    arrived.current = true
    item(selected)?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count > 0])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // An empty list leaves the arrow keys alone, so the screen can scroll.
      if (!count || e.metaKey || e.ctrlKey || e.altKey) return
      const step =
        e.key === 'ArrowDown' ? cols
        : e.key === 'ArrowUp' ? -cols
        : cols > 1 && e.key === 'ArrowRight' ? 1
        : cols > 1 && e.key === 'ArrowLeft' ? -1
        : 0
      if (!step) return
      e.preventDefault()
      const next = selected + step
      if (next < 0 || next >= count) return
      onSelect(next)
      const el = item(next)
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'nearest' })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, selected, onSelect, cols])
}
