/** @type {import('tailwindcss').Config} */

const themed = (v) =>
  `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`

module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Wrapped in color-mix so the /opacity modifier works. A bare
      // 'var(--bg)' cannot take one: Tailwind has no channels to inject alpha
      // into, so it silently generates no rule at all for bg-bg/90 — the class
      // lands in the markup and does nothing. color-mix keeps globals.css as
      // the single source of truth for the hex values, and <alpha-value>
      // resolves to 1 when no modifier is used, so bg-bg stays opaque.
      colors: {
        bg:          themed('--bg'),
        surface:     themed('--surface'),
        'surface-2': themed('--surface-2'),
        border:      themed('--border'),
        fg:          themed('--fg'),
        muted:       themed('--muted'),
        accent:      themed('--accent'),
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
