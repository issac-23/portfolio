import Background from '@/components/Background'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import About from '@/components/About'
import NowPlaying from '@/components/NowPlaying'
import MediaShelf from '@/components/MediaShelf'
import Projects from '@/components/Projects'
import Gallery from '@/components/Gallery'
import Contact from '@/components/Contact'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Background />
      {/* Nav sits outside <main> on purpose: a <header> descended from main
          does not map to the banner landmark, so nesting it there left the
          page with no banner. Nav is position:fixed, so this changes nothing
          visually. */}
      <Nav />
      <main id="main-content" style={{ position: 'relative', zIndex: 1 }}>
        <Hero />
        <About />
        <NowPlaying />
        <MediaShelf />
        <Projects />
        <Gallery />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
