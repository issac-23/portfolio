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
  {title: 'DCF Calculator',
    description: 'Intermediate two-stage DCF calculator for public stocks. Pulls real financials, projects 5-year free cash flows, and outputs fair value per share with a sensitivity table.',
    tags: ['Python', 'Streamlit', 'yfinance', 'pandas', 'plotly', 'numpy', 'pytest'],
    github: 'https://github.com/issac-23/dcf-calculator',
    status: 'wip',
  },
  {
    title: 'tally',
    description: 'Full-stack personal finance tracker with color-coded runway forecasting. Logs expenses by category and merchant, projects how long your savings last at the current burn rate, and calculates a sustainable monthly budget from your income.',
    tags: ['Next.js', 'TypeScript', 'Tailwind', 'Recharts','Supabase'],
    github: 'https://github.com/issac-23/tally',
    status: 'wip',
  },
]
