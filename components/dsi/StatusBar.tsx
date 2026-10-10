'use client'

import { useEffect, useState } from 'react'

const pad = (n: number) => String(n).padStart(2, '0')

// MM/DD HH:MM, the DSi's own format.
function stamp(d: Date) {
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Volume, user name, date and time, battery.
 *
 * The clock starts empty and fills in after mount. Rendering the time on the
 * server would stamp it with the build time and then mismatch on hydration.
 */
export default function StatusBar({ user }: { user: string }) {
  const [now, setNow] = useState('')

  useEffect(() => {
    const tick = () => setNow(stamp(new Date()))
    tick()
    const id = setInterval(tick, 20_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="dsi-status">
      <span className="dsi-vol" aria-hidden="true"><i /><i /><i /></span>
      <span className="dsi-user">{user}</span>
      <span className="dsi-status-gap" />
      <time suppressHydrationWarning>{now}</time>
      <span className="dsi-batt" aria-hidden="true" />
    </div>
  )
}
