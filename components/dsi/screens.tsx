'use client'

import type { ReactNode } from 'react'
import { projects } from '@/data/projects'
import type { AppId } from './apps'
import { ProjectDetail, ProjectList } from './ProjectsApp'
import { ProfileCard, ProfileStats } from './ProfileApp'
import { Album, PhotoView } from './CameraApp'
import { galleryPhotos } from '@/data/gallery'
import { NowPlayingCard, RecentlyPlayed } from './SoundApp'
import { ShelfItem, ShelfList } from './ShelfApp'
import { mediaItems } from '@/data/media'
import { ChatRoom, Channels } from './ChatApp'
import { BookletContents, BookletCover } from './ResumeApp'
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
  sound: {
    top: () => (
      <AppTop>
        <NowPlayingCard />
      </AppTop>
    ),
    bottom: c => <RecentlyPlayed onBack={c.back} />,
  },
  shelf: {
    top: c => (
      <AppTop>
        <ShelfItem item={mediaItems[c.sel]} />
      </AppTop>
    ),
    bottom: c => <ShelfList items={mediaItems} selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
  chat: {
    top: () => (
      <AppTop>
        <ChatRoom />
      </AppTop>
    ),
    bottom: c => <Channels selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
  resume: {
    top: () => (
      <AppTop>
        <BookletCover />
      </AppTop>
    ),
    bottom: c => <BookletContents onBack={c.back} />,
  },
}
