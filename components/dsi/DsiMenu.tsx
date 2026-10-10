'use client'

import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { galleryPhotos } from '@/data/gallery'
import { projects } from '@/data/projects'
import AppRail from './AppRail'
import { APPS, type AppId } from './apps'
import Device from './Device'
import { playLaunch, playReturn } from './launch'
import PhotoFrame from './PhotoFrame'
import { ProjectDetail, ProjectList } from './ProjectsApp'
import StatusBar from './StatusBar'

// Apps that open. The rest of the rail lands in #14; until then starting one
// does nothing rather than opening an empty screen.
const OPENS: AppId[] = ['projects']

/**
 * Owns both screens. Selection state has to drive the top and bottom screen
 * together, so it lives here rather than in either one, and so does which
 * app is open, since opening one replaces both screens at once.
 */
export default function DsiMenu() {
  const [open, setOpen] = useState<AppId | null>(null)
  const [app, setApp] = useState(0)
  const [card, setCard] = useState(0)
  // Set while a transition is running, so a second press cannot start
  // another one on top of it.
  const busy = useRef(false)
  // Only hand focus back to the rail when coming back from an app, never on
  // first load, where it would steal the skip link's place.
  const returning = useRef(false)

  const launch = useCallback((index: number, icon: HTMLElement) => {
    const id = APPS[index].id
    if (busy.current || !OPENS.includes(id)) return
    busy.current = true
    playLaunch(icon, () => flushSync(() => setOpen(id))).finally(() => {
      busy.current = false
    })
  }, [])

  const back = useCallback(() => {
    if (busy.current) return
    busy.current = true
    returning.current = true
    const from = document.querySelector('.dsi-device') ?? document.body
    playReturn(from, () => flushSync(() => setOpen(null))).finally(() => {
      busy.current = false
    })
  }, [])

  if (open === 'projects') {
    return (
      <Device
        top={
          <>
            <StatusBar user="Issac" />
            <ProjectDetail project={projects[card]} index={card} />
          </>
        }
        bottom={<ProjectList projects={projects} selected={card} onSelect={setCard} onBack={back} />}
      />
    )
  }

  return (
    <Device
      top={
        <>
          <StatusBar user="Issac" />
          <PhotoFrame photos={galleryPhotos} />
        </>
      }
      bottom={
        <div className="dsi-lower">
          <AppRail apps={APPS} initial={app} autoFocus={returning.current} onChange={setApp} onLaunch={launch} />
        </div>
      }
    />
  )
}
