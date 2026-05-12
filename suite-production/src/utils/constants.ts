export const AGENT_TYPES = {
  'seo-audit': {
    label: 'SEO Audit',
    description: 'Comprehensive website SEO analysis and recommendations',
    icon: 'Search',
    color: 'blue',
  },
  'geo-optimization': {
    label: 'GEO Optimization',
    description: 'Optimize for AI search engines (ChatGPT, Claude, Perplexity)',
    icon: 'Brain',
    color: 'purple',
  },
  'content-writer': {
    label: 'AI Content Writer',
    description: 'Generate SEO-optimized blog posts and content',
    icon: 'PenTool',
    color: 'green',
  },
  'reddit-monitor': {
    label: 'Reddit Monitor',
    description: 'Track mentions and opportunities on Reddit',
    icon: 'MessageSquare',
    color: 'orange',
  },
  'hackernews-monitor': {
    label: 'Hacker News Monitor',
    description: 'Monitor Hacker News for relevant discussions',
    icon: 'Terminal',
    color: 'amber',
  },
  'twitter-monitor': {
    label: 'X/Twitter Monitor',
    description: 'Track X/Twitter mentions and trends',
    icon: 'Twitter',
    color: 'sky',
  },
  'linkedin-monitor': {
    label: 'LinkedIn Monitor',
    description: 'Monitor LinkedIn for B2B opportunities',
    icon: 'Linkedin',
    color: 'blue',
  },
  'competitor-analysis': {
    label: 'Competitor Analysis',
    description: 'Analyze competitor strategies and performance',
    icon: 'Target',
    color: 'red',
  },
  'keyword-research': {
    label: 'Keyword Research',
    description: 'Discover high-value keywords and opportunities',
    icon: 'Key',
    color: 'yellow',
  },
  'backlink-builder': {
    label: 'Backlink Builder',
    description: 'Find and build quality backlinks',
    icon: 'Link',
    color: 'emerald',
  },
  'technical-seo': {
    label: 'Technical SEO',
    description: 'Fix technical SEO issues automatically',
    icon: 'Wrench',
    color: 'slate',
  },
  'content-optimizer': {
    label: 'Content Optimizer',
    description: 'Optimize existing content for better rankings',
    icon: 'Sparkles',
    color: 'pink',
  },
} as const

export const SEVERITY_COLORS = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
} as const

export const STATUS_COLORS = {
  idle: 'bg-slate-500/10 text-slate-400',
  running: 'bg-blue-500/10 text-blue-400 animate-pulse',
  completed: 'bg-green-500/10 text-green-400',
  error: 'bg-red-500/10 text-red-400',
  paused: 'bg-yellow-500/10 text-yellow-400',
} as const

export const PLAN_LIMITS = {
  free: {
    projects: 1,
    agents: 3,
    workflows: 1,
    contentPieces: 5,
    keywords: 50,
    apiCalls: 1000,
  },
  pro: {
    projects: 5,
    agents: 15,
    workflows: 10,
    contentPieces: 50,
    keywords: 500,
    apiCalls: 10000,
  },
  enterprise: {
    projects: -1,
    agents: -1,
    workflows: -1,
    contentPieces: -1,
    keywords: -1,
    apiCalls: -1,
  },
} as const
