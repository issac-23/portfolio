'use client'

import type { ReactNode } from 'react'
import { rememberView, type View } from './view'

/** A link to one view of the DSi that also remembers the choice. */
export default function ViewLink({ to, className, children }: { to: View; className?: string; children: ReactNode }) {
  return (
    <a className={className} href={to === 'plain' ? '/?view=plain' : '/'} onClick={() => rememberView(to)}>
      {children}
    </a>
  )
}
