'use client'

import type { ReactNode } from 'react'
import { projects } from '@/data/projects'
import { galleryPhotos } from '@/data/gallery'
import { mediaItems } from '@/data/media'
import type { AppId } from './apps'
import { Album, PhotoView } from './CameraApp'
import { ChatRoom, Channels } from './ChatApp'
import { ProfileCard, ProfileStats } from './ProfileApp'
import { ProjectDetail, ProjectList } from './ProjectsApp'
import { BookletContents, BookletCover } from './ResumeApp'
import { AppTop } from './screen'
import { SettingInfo, SettingsList } from './SettingsApp'
import { ShelfItem, ShelfList } from './ShelfApp'
import { NowPlayingCard, SoundLists } from './SoundApp'

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
 * What each app puts on its two screens. Typed over every `AppId`, so an app
 * added to the registry without a screen here is a compile error rather than
 * a START press that opens onto nothing.
 */
export const SCREENS: Record<AppId, Screen> = {
  profile: {
    top: () => (
      <AppTop>
        <ProfileCard />
      </AppTop>
    ),
    bottom: c => <ProfileStats onBack={c.back} />,
  },
  projects: {
    top: c => (
      <AppTop>
        <ProjectDetail project={projects[c.sel]} index={c.sel} />
      </AppTop>
    ),
    bottom: c => <ProjectList projects={projects} selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
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
    bottom: c => <SoundLists onBack={c.back} />,
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
    top: c => (
      <AppTop>
        <BookletCover page={c.sel} />
      </AppTop>
    ),
    bottom: c => <BookletContents selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
  settings: {
    top: c => (
      <AppTop>
        <SettingInfo index={c.sel} />
      </AppTop>
    ),
    bottom: c => <SettingsList selected={c.sel} onSelect={c.setSel} onBack={c.back} />,
  },
}
