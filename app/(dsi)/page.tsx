import DsiMenu from '@/components/dsi/DsiMenu'
import PlainView from '@/components/dsi/PlainView'
import ViewLink from '@/components/dsi/ViewLink'

// Read on the server, so plain view arrives as plain view rather than the
// device flashing up first, and a ?view=plain link can be shared as is.
export default function DsiPage({ searchParams }: { searchParams: { view?: string } }) {
  if (searchParams.view === 'plain') return <PlainView />

  return (
    <main className="dsi-stage" id="main-content">
      <h1 className="sr-only">Issac Ip — DSi menu</h1>
      {/* The way out comes before the device in the tab order, so nobody has
          to learn the DSi to skip it. */}
      <ViewLink to="plain" className="dsi-plain-link">
        Plain view
      </ViewLink>
      <DsiMenu />
    </main>
  )
}
