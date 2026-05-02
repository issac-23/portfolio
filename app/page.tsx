import Background from '@/components/Background'
import Nav from '@/components/Nav'
import Hero from '@/components/Hero'
import About from '@/components/About'
import NowPlaying from '@/components/NowPlaying'
import MediaShelf from '@/components/MediaShelf'
import Projects from '@/components/Projects'
import Gallery from '@/components/Gallery'
import Contact from '@/components/Contact'

export default function Home() {
  return (
    <>
      <Background />
      <main style={{ position: 'relative', zIndex: 1 }}>
        <Nav />
        <Hero />
        <About />
        <NowPlaying />
        <MediaShelf />
        <Projects />
        <Gallery />
        <Contact />
      </main>
    </>
  )
}
