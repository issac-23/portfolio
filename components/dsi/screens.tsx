'use client'

import type { ReactNode } from 'react'
import { projects } from '@/data/projects'
import type { AppId } from './apps'
import { ProjectDetail, ProjectList } from './ProjectsApp'
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
}
