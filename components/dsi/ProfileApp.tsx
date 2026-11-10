import { RESUME_PDF } from '@/data/links'
import { availability, profile } from '@/data/profile'
import { Person } from './apps'
import { AppLower } from './screen'

/** Upper screen: the user card the DSi opened its settings with. */
export function ProfileCard() {
  return (
    <div className="dsi-detail">
      <div className="dsi-detail-head">
        {/* The Profile tile's own artwork, so the card matches the icon you launched. */}
        <span className="dsi-avatar" aria-hidden="true">
          <Person />
        </span>
        <div>
          <h2>{profile.name}</h2>
          <span className="dsi-sub">{profile.headline}</span>
        </div>
      </div>
      <p className="dsi-avail">{availability}</p>
      {profile.bio.map(p => <p key={p}>{p}</p>)}
    </div>
  )
}

/** Lower screen: the facts as stat rows, then what I'm into. */
export function ProfileStats({ onBack }: { onBack: () => void }) {
  return (
    <AppLower onBack={onBack} actions={[{ label: 'Resume', name: 'Resume (PDF, new tab)', href: RESUME_PDF, external: true, primary: true }]}>
      <dl className="dsi-stats">
        {profile.stats.map(s => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
      <ul className="dsi-tags dsi-interests" aria-label="Into">
        {profile.interests.map(t => <li key={t}>{t}</li>)}
      </ul>
    </AppLower>
  )
}
