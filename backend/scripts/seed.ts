import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@aimarketing.com' },
    update: {},
    create: {
      email: 'demo@aimarketing.com',
      password: hashedPassword,
      name: 'Demo User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      role: 'admin',
      plan: 'pro',
    },
  })

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      name: 'SaaS Dashboard',
      url: 'https://saasdashboard.io',
      description: 'Analytics dashboard for SaaS businesses',
      status: 'active',
      userId: user.id,
    },
  })

  // Create demo agents
  const agents = [
    {
      name: 'SEO Audit Agent',
      type: 'seo_audit' as const,
      description: 'Comprehensive website SEO analysis',
      icon: 'Search',
      frequency: 'daily' as const,
    },
    {
      name: 'GEO Optimizer',
      type: 'geo_optimization' as const,
      description: 'Optimize for AI search engines',
      icon: 'Brain',
      frequency: 'daily' as const,
    },
    {
      name: 'Content Writer',
      type: 'content_writer' as const,
      description: 'AI-powered content generation',
      icon: 'PenTool',
      frequency: 'weekly' as const,
    },
    {
      name: 'Reddit Monitor',
      type: 'reddit_monitor' as const,
      description: 'Track Reddit mentions',
      icon: 'MessageSquare',
      frequency: 'hourly' as const,
    },
    {
      name: 'Hacker News Monitor',
      type: 'hackernews_monitor' as const,
      description: 'Monitor HN discussions',
      icon: 'Terminal',
      frequency: 'hourly' as const,
    },
    {
      name: 'X/Twitter Monitor',
      type: 'twitter_monitor' as const,
      description: 'Track X mentions',
      icon: 'Twitter',
      frequency: 'daily' as const,
    },
    {
      name: 'Competitor Analysis',
      type: 'competitor_analysis' as const,
      description: 'Analyze competitors',
      icon: 'Target',
      frequency: 'weekly' as const,
    },
    {
      name: 'Keyword Research',
      type: 'keyword_research' as const,
      description: 'Discover keywords',
      icon: 'Key',
      frequency: 'daily' as const,
    },
  ]

  for (const agentData of agents) {
    await prisma.agent.upsert({
      where: {
        id: `demo-agent-${agentData.type}`,
      },
      update: {},
      create: {
        id: `demo-agent-${agentData.type}`,
        ...agentData,
        status: 'idle',
        projectId: project.id,
        config: {},
        metrics: {
          create: {
            tasksCompleted: Math.floor(Math.random() * 500),
            successRate: 95 + Math.random() * 4,
            avgExecutionTime: Math.floor(Math.random() * 300),
            impactScore: Math.floor(70 + Math.random() * 25),
          },
        },
      },
    })
  }

  // Create demo keywords
  const keywords = [
    { keyword: 'saas analytics dashboard', volume: 2400, difficulty: 45, cpc: 8.5, currentPosition: 3, trend: 'up' as const, intent: 'commercial' as const },
    { keyword: 'analytics dashboard tools', volume: 1800, difficulty: 38, cpc: 6.2, currentPosition: 5, trend: 'up' as const, intent: 'commercial' as const },
    { keyword: 'startup metrics tracking', volume: 1200, difficulty: 32, cpc: 4.8, currentPosition: 2, trend: 'stable' as const, intent: 'informational' as const },
    { keyword: 'customer churn analysis', volume: 900, difficulty: 28, cpc: 5.5, currentPosition: 8, trend: 'up' as const, intent: 'informational' as const },
    { keyword: 'saas kpis dashboard', volume: 750, difficulty: 25, cpc: 3.2, currentPosition: 4, trend: 'up' as const, intent: 'commercial' as const },
  ]

  for (const kw of keywords) {
    await prisma.keyword.upsert({
      where: {
        projectId_keyword: {
          projectId: project.id,
          keyword: kw.keyword,
        },
      },
      update: {},
      create: {
        projectId: project.id,
        ...kw,
        serpFeatures: [],
      },
    })
  }

  // Create demo content
  const contents = [
    {
      title: 'The Complete Guide to SaaS Analytics Dashboards',
      type: 'blog' as const,
      status: 'published' as const,
      content: '# The Complete Guide to SaaS Analytics Dashboards\n\nIn today\'s data-driven world...',
      seoScore: 92,
      readabilityScore: 78,
      keywords: ['saas analytics', 'dashboard design'],
    },
    {
      title: '10 Metrics Every SaaS Founder Should Track',
      type: 'blog' as const,
      status: 'published' as const,
      content: '# 10 Metrics Every SaaS Founder Should Track\n\nTracking the right metrics...',
      seoScore: 88,
      readabilityScore: 82,
      keywords: ['saas metrics', 'founder guide'],
    },
    {
      title: 'How to Reduce Churn by 30%',
      type: 'blog' as const,
      status: 'review' as const,
      content: '# How to Reduce Churn by 30%\n\nCustomer churn is the silent killer...',
      seoScore: 85,
      readabilityScore: 75,
      keywords: ['churn reduction', 'retention'],
    },
  ]

  for (const content of contents) {
    await prisma.contentPiece.create({
      data: {
        projectId: project.id,
        ...content,
      },
    })
  }

  // Create demo notifications
  const notifications = [
    {
      userId: user.id,
      type: 'success' as const,
      title: 'SEO Audit Complete',
      message: 'Your weekly SEO audit has completed. Overall score: 78/100',
      read: false,
    },
    {
      userId: user.id,
      type: 'warning' as const,
      title: 'Keyword Ranking Drop',
      message: '"product analytics tools" dropped from #8 to #9',
      read: false,
    },
    {
      userId: user.id,
      type: 'info' as const,
      title: 'New Reddit Mention',
      message: 'Your product was mentioned in r/startups (234 upvotes)',
      read: true,
    },
  ]

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    })
  }
  
  // Create demo SEO Audit
  await prisma.sEOAudit.create({
    data: {
      projectId: project.id,
      overallScore: 78,
      categories: [
        { name: 'Performance', score: 85, status: 'good' },
        { name: 'Accessibility', score: 92, status: 'good' },
        { name: 'SEO', score: 72, status: 'warning' },
        { name: 'Best Practices', score: 88, status: 'good' },
        { name: 'PWA', score: 50, status: 'critical' }
      ],
      issues: [
        {
          id: 'issue-1',
          category: 'SEO',
          severity: 'critical',
          title: 'Missing Meta Descriptions',
          description: '12 pages are missing meta descriptions which can impact CTR.',
          impact: 'high',
          fix: 'Add unique meta descriptions to all high-traffic pages.'
        },
        {
          id: 'issue-2',
          category: 'Performance',
          severity: 'warning',
          title: 'Large Contentful Paint',
          description: 'LCP is higher than the recommended 2.5s.',
          impact: 'medium',
          fix: 'Optimize and compress hero images.'
        }
      ],
      recommendations: [
        {
          id: 'rec-1',
          priority: 1,
          category: 'SEO',
          title: 'Optimize Header Structure',
          description: 'Use a single H1 tag and proper hierarchy.',
          expectedImpact: '+15% Traffic',
          difficulty: 'easy',
          estimatedTime: '2 hours'
        }
      ],
      competitors: [
        {
          domain: 'competitor-a.com',
          authority: 52,
          backlinks: 4500,
          keywords: 1200,
          traffic: 45000,
          overlap: 35
        }
      ]
    }
  })

  console.log('Seeding completed!')
  console.log(`Demo user: demo@aimarketing.com / demo123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
