import DsiMenu from '@/components/dsi/DsiMenu'
import PlainView from '@/components/dsi/PlainView'
import Stage from '@/components/dsi/Stage'
import ViewLink from '@/components/dsi/ViewLink'
import { FAN_MADE } from '@/components/dsi/disclaimer'

// Read on the server, so plain view arrives as plain view rather than the
// device flashing up first, and a ?view=plain link can be shared as is.
export default function DsiPage({ searchParams }: { searchParams: { view?: string } }) {
  if (searchParams.view === 'plain') return <PlainView />

  return (
    <main className="dsi-stage" id="main-content">
      <Stage />
      {/* What a search result or a screen reader should lead with: who, not
          which console. */}
      <h1 className="sr-only">Issac Ip — CS + Economics at Northeastern</h1>
      {/* The two things a recruiter is most likely here for, ahead of the
          device in the tab order, so nobody has to learn the DSi to get them. */}
      <nav className="dsi-shortcuts" aria-label="Shortcuts">
        <a href="/resume.pdf" target="_blank" rel="noopener noreferrer">
          Resume
        </a>
        <ViewLink to="plain">Plain view</ViewLink>
      </nav>
      <DsiMenu />
      <p className="dsi-disclaimer">{FAN_MADE}</p>
    </main>
  )
}
