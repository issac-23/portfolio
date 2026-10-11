'use client'

import type { ReactNode } from 'react'
import { projects } from '@/data/projects'
import type { AppId } from './apps'
import { ProjectDetail, ProjectList } from './ProjectsApp'
import { ProfileCard, ProfileStats } from './ProfileApp'
import { Album, PhotoView } from './CameraApp'
import { galleryPhotos } from '@/data/gallery'
import { AppTop } from './screen'

/**
 * What every open app is handed. One selection index covers every app that
 * has one (a card, a photo, a shelf item), and it resets on each launch.
 */
export interface ScreenCtx {
  sel: number
  setSel: (index: number) => void
  back: () => void
}

/** An app is just what goes on each screen. */
export interface Screen {
  top: (c: ScreenCtx) => ReactNode
  bottom: (c: ScreenCtx) => ReactNode
}

/**
 * Every app that opens. Anything on the rail without an entry here ignores
 * START rather than opening onto an empty screen.
 */
export const SCREENS: Partial<Record<AppId, Screen>> = {
  projects: {
    top: c => (
      <AppTop>
        <ProjectDetail project={projects[c.sel]} index={c.sel} />
      </AppTop>
    ),
    bottom: c => <ProjectList projects={projects} selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
  profile: {
    top: () => (
      <AppTop>
        <ProfileCard />
      </AppTop>
    ),
    bottom: c => <ProfileStats onBack={c.back} />,
  },
  camera: {
    top: c => (
      <AppTop>
        <PhotoView photo={galleryPhotos[c.sel]} index={c.sel} total={galleryPhotos.length} />
      </AppTop>
    ),
    bottom: c => <Album photos={galleryPhotos} selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
}
