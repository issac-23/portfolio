export default function Hero() {
  return (
    <section id="top" className="min-h-screen flex items-center px-6 pt-20">
      <div className="max-w-4xl mx-auto w-full">
        <p className="text-accent text-xs font-medium tracking-widest uppercase mb-5">
          Hello, I&apos;m
        </p>
        <h1
          className="text-6xl md:text-8xl text-fg leading-none mb-6"
          style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
        >
          Issac Ip
        </h1>
        <p className="text-muted text-lg leading-relaxed max-w-sm mb-10">
          CS + Economics at Northeastern University.
          Into music, photography, and good company.
        </p>
        <div className="flex items-center gap-6 flex-wrap">
          <a
            href="#about"
            className="inline-flex items-center gap-2 text-sm text-fg border border-border rounded-full px-5 py-2.5 hover:border-accent hover:text-accent transition-all"
          >
            About me
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
          <a href="#contact" className="text-sm text-muted hover:text-fg transition-colors">
            Get in touch →
          </a>
        </div>
      </div>
    </section>
  )
}
