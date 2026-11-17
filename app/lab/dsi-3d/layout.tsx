import localFont from 'next/font/local'
import '../../(dsi)/dsi.css'

// The home page's screen face, so the DSi UI on the model reads the same.
const rounded = localFont({
  src: [
    { path: '../../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: '../../../node_modules/@fontsource/m-plus-rounded-1c/files/m-plus-rounded-1c-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-rounded',
  display: 'swap',
  adjustFontFallback: false,
  fallback: ['M PLUS Rounded Fallback', 'Trebuchet MS', 'system-ui', 'sans-serif'],
})

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className={rounded.variable}>{children}</div>
}
