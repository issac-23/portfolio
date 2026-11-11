'use client'

import type { AnchorHTMLAttributes } from 'react'
import { rememberView, type View } from './view'

type ViewLinkProps = { to: View } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>

/**
 * A link to one view of the DSi that also remembers the choice. Takes any
 * anchor props, so a list can spread useListNav's itemProps onto it.
 */
export default function ViewLink({ to, onClick, ...props }: ViewLinkProps) {
  return (
    <a
      {...props}
      href={to === 'plain' ? '/?view=plain' : '/'}
      onClick={e => {
        rememberView(to)
        onClick?.(e)
      }}
    />
  )
}
