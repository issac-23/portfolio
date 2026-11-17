'use client'

import dynamic from 'next/dynamic'

// three and the model load only in the browser, and only on this route.
const DsiScene = dynamic(() => import('./DsiScene'), {
  ssr: false,
  loading: () => <p className="absolute inset-0 grid place-items-center text-sm text-[#0e4155]">Loading the DSi...</p>,
})

const CREDIT = {
  model: 'https://sketchfab.com/3d-models/dsi-2d03bc1178a54658872030e22ac77c35',
  author: 'https://sketchfab.com/Cleanman00',
  license: 'http://creativecommons.org/licenses/by/4.0/',
}

export default function DsiLab() {
  return (
    <main
      className="relative h-[100svh] w-full overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #a9cbee 0%, #bad6f2 35%, #cbe1f4 65%, #dcebf4 100%)' }}
    >
      <DsiScene />
      <p className="pointer-events-none absolute inset-x-0 bottom-2 px-4 text-center text-[10px] leading-snug text-[#0e4155]/80">
        <span className="pointer-events-auto">
          This work is based on &quot;DSi&quot; (<a href={CREDIT.model}>{CREDIT.model}</a>) by Cleanman00 (
          <a href={CREDIT.author}>{CREDIT.author}</a>) licensed under CC-BY-4.0 (
          <a href={CREDIT.license}>{CREDIT.license}</a>)
        </span>
      </p>
    </main>
  )
}
