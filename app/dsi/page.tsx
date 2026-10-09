import Device from '@/components/dsi/Device'

/**
 * Shell only, for now. Both screens are deliberately empty: the home menu
 * carousel and the app screens land in later stages, so this one can be judged
 * purely on whether the hardware fits the viewport without the page scrolling.
 */
export default function DsiPage() {
  return (
    <main className="dsi-stage" id="main-content">
      <h1 className="sr-only">Issac Ip — DSi menu</h1>
      <Device />
    </main>
  )
}
