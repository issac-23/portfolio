'use client'

import Device from './Device'
import StatusBar from './StatusBar'

/**
 * Owns both screens. Selection state has to drive the top and bottom screen
 * together, so it lives here rather than in either one.
 */
export default function DsiMenu() {
  return <Device top={<StatusBar user="Issac" />} />
}
