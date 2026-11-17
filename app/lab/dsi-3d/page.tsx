import type { Metadata } from 'next'
import DsiLab from './DsiLab'

// Throwaway prototype for issue #52. Not linked from anywhere, not indexed.
export const metadata: Metadata = {
  title: 'DSi 3D prototype',
  robots: { index: false },
}

export default function Page() {
  return <DsiLab />
}
