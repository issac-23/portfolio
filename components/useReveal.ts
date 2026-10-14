'use client'

import { useEffect, useRef } from 'react'

/**
 * The classic page's section entrance. A section carries `section-fade`
 * (hidden, shifted down) and gains `visible` the first time enough of it is
 * on screen; the CSS does the rest.
 *
 * Observers are shared per threshold rather than built per section, and a
 * section is dropped from the observer once it has been revealed, since
 * nothing ever hides it again.
 */
const observers = new Map<number, IntersectionObserver>()

function observerFor(threshold: number) {
  let io = observers.get(threshold)
  if (!io) {
    io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('visible')
          io!.unobserve(entry.target)
        }
      },
      { threshold },
    )
    observers.set(threshold, io)
  }
  return io
}

/** Attach the returned ref to a `section-fade` element. `threshold` is how much of it must show first. */
export function useReveal<T extends HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const io = observerFor(threshold)
    io.observe(node)
    return () => io.unobserve(node)
  }, [threshold])
  return ref
}
