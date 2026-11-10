import Image from 'next/image'
import { PHOTO_THUMB_SIZES, galleryPhotos, photoLabel } from '@/data/gallery'
import { mediaItems, mediaTypeLabels } from '@/data/media'
import { availability, channels, profile } from '@/data/profile'
import { RESUME_PDF, externalProps, newTabProps } from '@/data/links'
import { NO_LIVE_LINK, projects, statusLabels } from '@/data/projects'
import PlainListening from './PlainListening'
import ViewLink from './ViewLink'
import { FAN_MADE } from './disclaimer'

/**
 * Plain view: everything the DSi holds, as an ordinary document. For anyone
 * who does not want to play along, and for anything that reads pages rather
 * than playing them: screen readers, printers, a recruiter in a hurry.
 *
 * Same data files, same order as the rail, no shell.
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

      <section aria-labelledby="plain-about">
        <h2 id="plain-about">About</h2>
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

      <section aria-labelledby="plain-projects">
        <h2 id="plain-projects">Projects</h2>
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

      <section aria-labelledby="plain-photos">
        <h2 id="plain-photos">Photos</h2>
        <ul className="dsi-plain-photos">
          {galleryPhotos.map((ph, i) => (
            <li key={ph.src}>
              <Image src={ph.src} alt={photoLabel(ph, i)} width={ph.width} height={ph.height} sizes={PHOTO_THUMB_SIZES} />
              {ph.caption && <span>{ph.caption}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="plain-listening">
        <h2 id="plain-listening">Listening</h2>
        <PlainListening />
      </section>

      <section aria-labelledby="plain-shelf">
        <h2 id="plain-shelf">Shelf</h2>
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

      <section aria-labelledby="plain-contact">
        <h2 id="plain-contact">Contact</h2>
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
      <footer>
        <p className="dsi-plain-disclaimer">{FAN_MADE}</p>
      </footer>
    </main>
  )
}
