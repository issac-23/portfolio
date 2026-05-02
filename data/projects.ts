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
  {
    title: 'tally',
    description: 'A budget and finance tracker to help me manage my expenses and savings.',
    tags: ['Next.js', 'TypeScript', 'Tailwind', 'Recharts','Supabase'],
    github: 'https://github.com/issac-23/tally',
    status: 'wip',
  },
]
