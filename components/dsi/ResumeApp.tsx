import { profile } from '@/data/profile'
import { AppLower } from './screen'

const PDF = '/resume.pdf'

// The PDF's own section headings, in order. They are what the booklet is
// for, so they are the contents page; if the resume gains a section, add it.
const CONTENTS = ['Education', 'Experience', 'Projects', 'Skills']

/** Upper screen: the booklet's cover. */
export function BookletCover() {
  return (
    <div className="dsi-booklet">
      <span className="dsi-booklet-kicker">Instruction Booklet</span>
      <h2>{profile.name}</h2>
      <span className="dsi-sub">{profile.headline}</span>
    </div>
  )
}

/** Lower screen: the contents, and the booklet itself. */
export function BookletContents({ onBack }: { onBack: () => void }) {
  return (
    <AppLower
      onBack={onBack}
      actions={[
        { label: 'Read', name: 'Read resume (PDF, new tab)', href: PDF, external: true, primary: true },
        { label: 'Download', name: 'Download resume (PDF)', href: PDF, download: true, external: false },
      ]}
    >
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
