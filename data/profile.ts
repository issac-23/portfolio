// ─────────────────────────────────────────────────────────────────
// Who's behind the site. Read by the DSi menu's Profile and PictoChat
// screens; the classic layout still has its own copy in About.tsx and
// Contact.tsx until the cutover decides which one stays.
// ─────────────────────────────────────────────────────────────────

export const profile = {
  name: 'Issac Ip',
  headline: 'CS + Economics at Northeastern',
  bio: [
    "I'm a second-year at Northeastern University studying Computer Science and Economics, drawn to where technology, creative culture and people meet.",
    "Outside of class I'm deep in a music rabbit hole, somewhere with a camera, or hanging out with people I like.",
  ],
  /** The stat rows on the Profile screen, in order. */
  stats: [
    { label: 'Studying', value: 'CS + Economics' },
    { label: 'School', value: 'Northeastern University' },
    { label: 'Year', value: 'Second-year' },
    { label: 'Based', value: 'Boston, MA' },
  ],
  interests: ['Music', 'Photography', 'Economics', 'Tech', 'Podcasts', 'Friends'],
}

export interface Channel {
  label: string
  /** What the channel shows, like the address or handle. */
  handle: string
  href: string
}

/** Every way to reach Issac, in the order they should be offered. */
export const channels: Channel[] = [
  { label: 'Email', handle: 'issacip23@gmail.com', href: 'mailto:issacip23@gmail.com' },
  { label: 'LinkedIn', handle: 'issacip1', href: 'https://www.linkedin.com/in/issacip1/' },
  { label: 'GitHub', handle: 'issac-23', href: 'https://github.com/issac-23' },
]
