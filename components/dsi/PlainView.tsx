import Image from 'next/image'
import { Fragment, type ReactElement } from 'react'
import { PHOTO_THUMB_SIZES, galleryPhotos, photoLabel } from '@/data/gallery'
import { mediaItems, mediaTypeLabels } from '@/data/media'
import { availability, channels, profile } from '@/data/profile'
import { RESUME_PDF, externalProps, newTabProps } from '@/data/links'
import { NO_LIVE_LINK, projects, statusLabels } from '@/data/projects'
import PlainListening from './PlainListening'
import { APPS, APP_BY_ID, type AppId } from './apps'
import ViewLink from './ViewLink'
import { FAN_MADE } from './disclaimer'

/**
 * One section per app, so the page reads in the rail's order. Resume is the
 * quick link at the top and Settings has nothing to read, hence null.
 */
const SECTIONS: Record<AppId, ReactElement | null> = {
  profile: (
    <section aria-labelledby={APP_BY_ID.profile.plain}>
      <h2 id={APP_BY_ID.profile.plain}>About</h2>
      {profile.bio.map(p => <p key={p}>{p}</p>)}
      <dl className="dsi-plain-stats">
        {profile.stats.map(s => (
          <div key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  ),
  projects: (
    <section aria-labelledby={APP_BY_ID.projects.plain}>
      <h2 id={APP_BY_ID.projects.plain}>Projects</h2>
      {projects.map(p => (
        <article key={p.title} className="dsi-plain-card">
          <h3>
            {p.title} <span className="dsi-plain-badge">{statusLabels[p.status]}</span>
          </h3>
          <p>{p.description}</p>
          <p className="dsi-plain-meta">{p.tags.join(' · ')}</p>
          <p className="dsi-plain-links">
            {p.url ? <a href={p.url} {...externalProps(p.url)}>Open {p.title}</a> : <span>{NO_LIVE_LINK}</span>}
            {p.github && <a href={p.github} {...externalProps(p.github)}>{p.title} on GitHub</a>}
          </p>
        </article>
      ))}
    </section>
  ),
  camera: (
    <section aria-labelledby={APP_BY_ID.camera.plain}>
      <h2 id={APP_BY_ID.camera.plain}>Photos</h2>
      <ul className="dsi-plain-photos">
        {galleryPhotos.map((ph, i) => (
          <li key={ph.src}>
            <Image src={ph.src} alt={photoLabel(ph, i)} width={ph.width} height={ph.height} sizes={PHOTO_THUMB_SIZES} />
            {ph.caption && <span>{ph.caption}</span>}
          </li>
        ))}
      </ul>
    </section>
  ),
  sound: (
    <section aria-labelledby={APP_BY_ID.sound.plain}>
      <h2 id={APP_BY_ID.sound.plain}>Listening</h2>
      <PlainListening />
    </section>
  ),
  shelf: (
    <section aria-labelledby={APP_BY_ID.shelf.plain}>
      <h2 id={APP_BY_ID.shelf.plain}>Shelf</h2>
      <ul className="dsi-plain-shelf">
        {mediaItems.map(m => (
          <li key={m.url}>
            <a href={m.url} {...externalProps(m.url)}>{m.title}</a>
            <span className="dsi-plain-meta">
              {mediaTypeLabels[m.type].one} by {m.creator}
              {m.date ? `, ${m.date}` : ''}
            </span>
            {m.note && <q>{m.note}</q>}
          </li>
        ))}
      </ul>
    </section>
  ),
  chat: (
    <section aria-labelledby={APP_BY_ID.chat.plain}>
      <h2 id={APP_BY_ID.chat.plain}>Contact</h2>
      <ul className="dsi-plain-contact">
        {channels.map(c => (
          <li key={c.label}>
            {c.label}:{' '}
            <a href={c.href} {...externalProps(c.href)}>
              {c.handle}
            </a>
          </li>
        ))}
      </ul>
    </section>
  ),
  resume: null,
  settings: null,
}

/**
 * Plain view: everything the DSi holds, as an ordinary document. For anyone
 * who does not want to play along, and for anything that reads pages rather
 * than playing them: screen readers, printers, a recruiter in a hurry.
 *
 * Same data files, same order as the rail (see SECTIONS), no shell.
 */
export default function PlainView() {
  return (
    <main className="dsi-plain" id="main-content">
      <header className="dsi-plain-head">
        <h1>{profile.name}</h1>
        <p>{profile.headline}</p>
        <p className="dsi-plain-avail">{availability}</p>
        <nav aria-label="Quick links">
          <a href={RESUME_PDF} {...newTabProps}>Resume (PDF)</a>
          {channels.map(c => (
            <a key={c.label} href={c.href} {...externalProps(c.href)}>
              {c.label}
            </a>
          ))}
        </nav>
        <ViewLink to="dsi" className="dsi-plain-switch">Back to the DSi</ViewLink>
      </header>

      {APPS.map(a => (
        <Fragment key={a.id}>{SECTIONS[a.id]}</Fragment>
      ))}
      <footer>
        <p className="dsi-plain-disclaimer">{FAN_MADE}</p>
      </footer>
    </main>
  )
}
