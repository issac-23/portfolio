'use client'

import { useEffect, useRef } from 'react'

const tags = ['Music', 'Photography', 'Economics', 'Tech', 'Podcasts', 'Friends']

export default function About() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) entry.target.classList.add('visible') },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="about" ref={ref} className="section-fade py-24 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-[1fr_2fr] gap-12 items-start">

          <div>
            <span className="text-xs text-accent tracking-widest uppercase font-medium">About</span>
            <h2
              className="text-3xl text-fg mt-3"
              style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
            >
              Who I am
            </h2>
          </div>

          <div className="space-y-5 text-muted leading-relaxed">
            <p>
              I&apos;m Issac — a rising second-year at{' '}
              <span className="text-fg">Northeastern University</span> studying{' '}
              <span className="text-fg">Computer Science and Economics</span>.
              I&apos;m drawn to the intersection of technology, creative culture, and how people connect.
            </p>
            <p>
              Outside of class you&apos;ll find me deep in a music rabbit hole, somewhere with a camera,
              or just hanging out with people I like. I think the best ideas come from being genuinely
              curious — about people, places, and everything in between.
            </p>
            <p>
              This site is a little corner of the internet that&apos;s mine — a place to share
              what I&apos;m listening to, reading, watching, and thinking about.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted border border-border rounded-full px-3 py-1 hover:border-accent hover:text-accent transition-all cursor-default"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
