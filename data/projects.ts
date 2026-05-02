export interface Project {
  title: string
  description: string
  tags: string[]
  url?: string
  github?: string
  status: 'live' | 'wip' | 'concept'
}

// ─────────────────────────────────────────────────────────────────
// HOW TO ADD PROJECTS:
// Add new entries to the top of this array.
// status: 'live' | 'wip' (in progress) | 'concept'
// url: deployed link (optional)
// github: repo link (optional)
// ─────────────────────────────────────────────────────────────────
export const projects: Project[] = [
  // {
  //   title: 'My Project',
  //   description: 'A short description of what it does and why you built it.',
  //   tags: ['Next.js', 'TypeScript', 'Tailwind'],
  //   url: 'https://yourproject.com',
  //   github: 'https://github.com/you/project',
  //   status: 'live',
  // },
]
