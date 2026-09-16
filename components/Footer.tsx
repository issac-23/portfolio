/**
 * Site footer, deliberately rendered as a sibling of <main> rather than
 * inside it.
 *
 * Per HTML-AAM, <footer> only maps to the contentinfo landmark when it is not
 * a descendant of sectioning content. This markup used to be a plain <div> at
 * the end of Contact's <section>, which meant the page exposed no contentinfo
 * at all and landmark navigation offered a screen reader user only "main".
 *
 * Spacing is unchanged: Contact's own pb-24 supplies the gap above the rule
 * that its mt-24 used to.
 */
export default function Footer() {
  return (
    <footer className="px-6 pb-24">
      <div className="max-w-4xl mx-auto pt-8 border-t border-border flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          © 2026 Issac Ip
        </p>
        <a
          href="#top"
          className="text-xs text-muted hover:text-fg transition-colors"
        >
          Back to top ↑
        </a>
      </div>
    </footer>
  )
}
