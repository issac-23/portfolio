'use client'

import { useRef } from 'react'
import { channels, type Channel } from '@/data/profile'
import { AppLower, useListNav } from './screen'

const MESSAGES = [
  'hey!',
  "Whether you want to chat, collaborate, or just say hi, I'm always down to connect.",
  'Pick a channel below and I will get back to you.',
]

/**
 * Upper screen: the chat room. PictoChat's ruled paper, with each message
 * in its own box behind a name tag.
 */
export function ChatRoom() {
  return (
    <div className="dsi-chat" role="log" aria-label="Messages">
      {MESSAGES.map(m => (
        <p key={m} className="dsi-bubble">
          <b>Issac</b>
          <span>{m}</span>
        </p>
      ))}
    </div>
  )
}

interface ChannelsProps {
  selected: number
  onSelect: (index: number) => void
  onBack: () => void
}

/** Lower screen: the channels you can actually reach me on. */
export function Channels({ selected, onSelect, onBack }: ChannelsProps) {
  const list = useRef<HTMLUListElement>(null)
  useListNav({ container: list, count: channels.length, selected, onSelect })

  return (
    <AppLower onBack={onBack}>
      <ul className="dsi-cards" ref={list} aria-label="Channels">
        {channels.map((c: Channel, i) => {
          const external = /^https?:/.test(c.href)
          return (
            <li key={c.label}>
              <a
                className="dsi-card"
                href={c.href}
                data-idx={i}
                data-sel={i === selected || undefined}
                tabIndex={i === selected ? 0 : -1}
                onFocus={() => onSelect(i)}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className="dsi-card-text">
                  <b>{c.label}</b>
                  <span>{c.handle}</span>
                </span>
              </a>
            </li>
          )
        })}
      </ul>
    </AppLower>
  )
}
