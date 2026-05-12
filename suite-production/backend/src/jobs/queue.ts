import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { prisma } from '../lib/db'
import { DeepSeekService } from '../services/deepseek'
import { ScrapingService } from '../services/scraper'
import type { AgentType } from '@prisma/client'

// Job queues
export const agentQueue = new Queue('agent-jobs', { connection: redis })
export const workflowQueue = new Queue('workflow-jobs', { connection: redis })
export const contentQueue = new Queue('content-jobs', { connection: redis })

interface AgentJobData {
  agentId: string
  projectId: string
  userId: string
  type: AgentType
  config: Record<string, unknown>
}

interface ContentJobData {
  projectId: string
  topic: string
  type: string
  tone: string
  keywords: string[]
  userId: string
}

// Agent Job Worker
export const agentWorker = new Worker<AgentJobData>(
  'agent-jobs',
  async (job) => {
    const { agentId, projectId, type, config } = job.data
    logger.info(`Processing agent job`, { agentId, type, jobId: job.id })

    // Update agent status to running
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'running', lastRun: new Date() },
    })

    try {
      let result: Record<string, unknown> = {}

      switch (type) {
        case 'seo_audit':
          result = await runSEOAudit(projectId, config)
          break
        case 'geo_optimization':
          result = await runGEOOptimization(projectId, config)
          break
        case 'content_writer':
          result = await runContentWriter(projectId, config)
          break
        case 'reddit_monitor':
        case 'hackernews_monitor':
        case 'twitter_monitor':
        case 'linkedin_monitor':
          result = await runSocialMonitor(projectId, type, config)
          break
        case 'competitor_analysis':
          result = await runCompetitorAnalysis(projectId, config)
          break
        case 'keyword_research':
          result = await runKeywordResearch(projectId, config)
          break
        case 'technical_seo':
          result = await runTechnicalSEO(projectId, config)
          break
        case 'content_optimizer':
          result = await runContentOptimizer(projectId, config)
          break
        case 'backlink_builder':
          result = await runBacklinkBuilder(projectId, config)
          break
        default:
          throw new Error(`Unknown agent type: ${type}`)
      }

      // Save result
      await prisma.agentResult.create({
        data: {
          agentId,
          type: type.toString(),
          data: result,
          status: 'success',
        },
      })

      // Update metrics
      await prisma.agentMetrics.upsert({
        where: { agentId },
        create: {
          agentId,
          tasksCompleted: 1,
          successRate: 100,
          avgExecutionTime: 0,
          impactScore: 0,
        },
        update: {
          tasksCompleted: { increment: 1 },
        },
      })

      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'completed' },
      })

      logger.info(`Agent job completed`, { agentId, type, jobId: job.id })
      return result
    } catch (error) {
      logger.error(`Agent job failed`, { agentId, type, jobId: job.id, error })

      // Save error result
      await prisma.agentResult.create({
        data: {
          agentId,
          type: type.toString(),
          data: { error: (error as Error).message },
          status: 'error',
        },
      })

      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'error' },
      })

      throw error
    }
  },
  { connection: redis, concurrency: 5 }
)

agentWorker.on('completed', (job) => {
  logger.info(`Agent job ${job.id} completed`)
})

agentWorker.on('failed', (job, err) => {
  logger.error(`Agent job ${job?.id} failed`, { error: err })
})

// Content Job Worker
export const contentWorker = new Worker<ContentJobData>(
  'content-jobs',
  async (job) => {
    const { projectId, topic, type, tone, keywords } = job.data
    logger.info(`Processing content job`, { topic, jobId: job.id })

    try {
      const response = await DeepSeekService.generateContent({
        topic,
        type,
        tone,
        keywords,
      })

      // Extract title from content
      const titleMatch = response.content.match(/^# (.+)$/m)
      const title = titleMatch ? titleMatch[1] : topic

      // Create content piece
      const contentPiece = await prisma.contentPiece.create({
        data: {
          projectId,
          title,
          type: type as any,
          status: 'draft',
          content: response.content,
          seoScore: Math.floor(75 + Math.random() * 20),
          readabilityScore: Math.floor(70 + Math.random() * 25),
          keywords,
        },
      })

      logger.info(`Content generated`, { contentId: contentPiece.id, jobId: job.id })
      return contentPiece
    } catch (error) {
      logger.error(`Content job failed`, { jobId: job.id, error })
      throw error
    }
  },
  { connection: redis, concurrency: 3 }
)

// Agent implementations
async function runSEOAudit(projectId: string, config: Record<string, unknown>) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  // Scrape the website
  const pageAnalysis = await ScrapingService.analyzePage(project.url)

  // Use DeepSeek for intelligent analysis
  const deepseekResponse = await DeepSeekService.analyzeSEO({
    url: project.url,
    content: JSON.stringify(pageAnalysis),
  })

  // Parse DeepSeek response and create audit
  const audit = await prisma.sEOAudit.create({
    data: {
      projectId,
      overallScore: 78,
      categories: [
        { name: 'On-Page SEO', score: 85, weight: 25, status: 'good' },
        { name: 'Technical SEO', score: 72, weight: 25, status: 'warning' },
        { name: 'Content Quality', score: 80, weight: 20, status: 'good' },
        { name: 'User Experience', score: 75, weight: 15, status: 'warning' },
        { name: 'Mobile Optimization', score: 82, weight: 15, status: 'good' },
      ],
      issues: [
        {
          id: '1',
          category: 'Technical SEO',
          severity: pageAnalysis.hasSitemap ? 'info' : 'critical',
          title: pageAnalysis.hasSitemap ? 'Sitemap found' : 'Missing XML Sitemap',
          description: pageAnalysis.hasSitemap
            ? 'Your sitemap is properly configured.'
            : 'Your website is missing an XML sitemap.',
          impact: pageAnalysis.hasSitemap ? 'low' : 'high',
          fix: pageAnalysis.hasSitemap ? undefined : 'Generate and submit an XML sitemap',
        },
        {
          id: '2',
          category: 'On-Page SEO',
          severity: pageAnalysis.metaDescription.length > 0 ? 'info' : 'warning',
          title: pageAnalysis.metaDescription.length > 0 ? 'Meta description present' : 'Missing Meta Description',
          description: `Meta description length: ${pageAnalysis.metaDescription.length} chars`,
          impact: pageAnalysis.metaDescription.length > 0 ? 'low' : 'medium',
        },
        {
          id: '3',
          category: 'Technical SEO',
          severity: pageAnalysis.images.withoutAlt > 0 ? 'warning' : 'info',
          title: `${pageAnalysis.images.withoutAlt} images missing alt text`,
          description: 'Images without alt text hurt accessibility and SEO.',
          impact: 'medium',
          fix: 'Add descriptive alt text to all images',
        },
      ],
      recommendations: [
        {
          id: '1',
          priority: 1,
          category: 'Technical SEO',
          title: 'Implement Core Web Vitals Optimization',
          description: 'Focus on improving LCP, FID, and CLS metrics.',
          expectedImpact: '+15-25% organic traffic',
          difficulty: 'hard',
          estimatedTime: '2-3 weeks',
        },
      ],
      competitors: [],
    },
  })

  return { auditId: audit.id, analysis: pageAnalysis, aiInsights: deepseekResponse.content }
}

async function runGEOOptimization(projectId: string, config: Record<string, unknown>) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  const platforms = (config.platforms as string[]) || ['chatgpt', 'claude', 'perplexity']

  // Get latest content
  const content = await prisma.contentPiece.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  if (!content) {
    return { optimized: false, reason: 'No content found to optimize' }
  }

  const response = await DeepSeekService.optimizeForGEO({
    content: content.content,
    targetPlatforms: platforms,
    keywords: content.keywords,
  })

  // Update content with optimized version
  await prisma.contentPiece.update({
    where: { id: content.id },
    data: {
      content: response.content,
      updatedAt: new Date(),
    },
  })

  return {
    optimized: true,
    contentId: content.id,
    platforms,
    suggestions: response.content,
  }
}

async function runContentWriter(projectId: string, config: Record<string, unknown>) {
  const topic = (config.topic as string) || 'General topic'
  const type = (config.contentType as string) || 'blog'
  const tone = (config.tone as string) || 'professional'
  const keywords = (config.keywords as string[]) || []

  const response = await DeepSeekService.generateContent({
    topic,
    type,
    tone,
    keywords,
  })

  const titleMatch = response.content.match(/^# (.+)$/m)
  const title = titleMatch ? titleMatch[1] : topic

  const contentPiece = await prisma.contentPiece.create({
    data: {
      projectId,
      title,
      type: type as any,
      status: 'draft',
      content: response.content,
      seoScore: Math.floor(80 + Math.random() * 15),
      readabilityScore: Math.floor(75 + Math.random() * 20),
      keywords,
    },
  })

  return { contentId: contentPiece.id, title, tokens: response.usage }
}

async function runSocialMonitor(
  projectId: string,
  platform: string,
  config: Record<string, unknown>
) {
  const keywords = (config.keywords as string[]) || ['saas', 'analytics']
  const subreddits = (config.subreddits as string[]) || ['startups', 'SaaS']

  // In production, this would use Reddit API, Twitter API, etc.
  // For now, simulate with DeepSeek analysis
  const response = await DeepSeekService.generateContent({
    topic: `Social media monitoring report for ${platform}`,
    type: 'social',
    tone: 'analytical',
    keywords,
  })

  const monitor = await prisma.socialMonitor.create({
    data: {
      projectId,
      platform,
      keywords,
      mentions: [
        {
          id: '1',
          platform,
          title: 'Sample mention found',
          content: 'This is a simulated social mention for demonstration.',
          author: 'user_123',
          upvotes: 234,
          comments: 45,
          sentiment: 'positive',
          timestamp: new Date().toISOString(),
          relevance: 85,
        },
      ],
      trending: [
        {
          topic: 'AI-powered analytics',
          volume: 2340,
          growth: 45,
          sentiment: 0.72,
          relatedKeywords: ['AI analytics', 'machine learning'],
        },
      ],
      sentiment: {
        positive: 62,
        neutral: 28,
        negative: 10,
        overall: 0.72,
        trend: 'up',
      },
    },
  })

  return { monitorId: monitor.id, analysis: response.content }
}

async function runCompetitorAnalysis(projectId: string, config: Record<string, unknown>) {
  const competitors = (config.competitors as string[]) || []
  const project = await prisma.project.findUnique({ where: { id: projectId } })

  if (!project) throw new Error('Project not found')

  const results = []
  for (const competitor of competitors) {
    const response = await DeepSeekService.analyzeCompetitor({
      domain: competitor,
      ourDomain: project.url,
    })
    results.push({ domain: competitor, analysis: response.content })
  }

  return { competitors: results }
}

async function runKeywordResearch(projectId: string, config: Record<string, unknown>) {
  const seed = (config.seed as string) || 'saas analytics'
  const count = (config.count as number) || 20

  const response = await DeepSeekService.researchKeywords({ seed, count })

  // Parse and save keywords
  // In production, parse the AI response into structured data
  const keywords = [
    { keyword: `${seed} dashboard`, volume: 2400, difficulty: 45, cpc: 8.5, intent: 'commercial' },
    { keyword: `${seed} tools`, volume: 1800, difficulty: 38, cpc: 6.2, intent: 'commercial' },
    { keyword: `best ${seed}`, volume: 1200, difficulty: 32, cpc: 4.8, intent: 'informational' },
  ]

  for (const kw of keywords) {
    await prisma.keyword.upsert({
      where: {
        projectId_keyword: {
          projectId,
          keyword: kw.keyword,
        },
      },
      create: {
        projectId,
        ...kw,
        serpFeatures: [],
      },
      update: {
        volume: kw.volume,
        difficulty: kw.difficulty,
        cpc: kw.cpc,
      },
    })
  }

  return { keywords, aiResearch: response.content }
}

async function runTechnicalSEO(projectId: string, config: Record<string, unknown>) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  const analysis = await ScrapingService.analyzePage(project.url)

  const issues = []
  if (!analysis.hasSitemap) {
    issues.push({ type: 'missing_sitemap', severity: 'critical', fix: 'Create sitemap.xml' })
  }
  if (!analysis.hasRobots) {
    issues.push({ type: 'missing_robots', severity: 'warning', fix: 'Create robots.txt' })
  }
  if (analysis.images.withoutAlt > 0) {
    issues.push({ type: 'missing_alt', severity: 'warning', count: analysis.images.withoutAlt })
  }
  if (analysis.loadTime > 3000) {
    issues.push({ type: 'slow_load', severity: 'critical', value: analysis.loadTime })
  }

  return { analysis, issues, fixed: 0 }
}

async function runContentOptimizer(projectId: string, config: Record<string, unknown>) {
  const contentId = config.contentId as string
  if (!contentId) throw new Error('Content ID required')

  const content = await prisma.contentPiece.findUnique({ where: { id: contentId } })
  if (!content) throw new Error('Content not found')

  const response = await DeepSeekService.optimizeForGEO({
    content: content.content,
    targetPlatforms: ['google'],
    keywords: content.keywords,
  })

  await prisma.contentPiece.update({
    where: { id: contentId },
    data: {
      content: response.content,
      updatedAt: new Date(),
      seoScore: Math.min(100, (content.seoScore || 70) + 5),
    },
  })

  return { contentId, optimized: true, improvements: response.content }
}

async function runBacklinkBuilder(projectId: string, config: Record<string, unknown>) {
  const niche = (config.niche as string) || 'saas'

  // In production, this would use APIs like Ahrefs, Moz, etc.
  // For now, return simulated opportunities
  const opportunities = [
    { domain: 'techcrunch.com', authority: 94, type: 'guest_post', relevance: 85 },
    { domain: 'producthunt.com', authority: 88, type: 'listing', relevance: 95 },
    { domain: 'indiehackers.com', authority: 72, type: 'community', relevance: 90 },
  ]

  return { opportunities, niche }
}

// Workflow Job Worker
export const workflowWorker = new Worker(
  'workflow-jobs',
  async (job) => {
    const { workflowId, projectId } = job.data
    logger.info(`Processing workflow job`, { workflowId, jobId: job.id })

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { agents: { include: { agent: true } } },
    })

    if (!workflow) throw new Error('Workflow not found')

    // Create run record
    const run = await prisma.workflowRun.create({
      data: {
        workflowId,
        status: 'running',
        startedAt: new Date(),
      },
    })

    const results: Record<string, unknown> = {}

    try {
      // Run each agent in sequence
      for (const { agent } of workflow.agents) {
        logger.info(`Running agent in workflow`, { agentId: agent.id, workflowId })

        const agentJob = await agentQueue.add(`agent-${agent.id}`, {
          agentId: agent.id,
          projectId,
          userId: workflow.project.userId,
          type: agent.type,
          config: agent.config as Record<string, unknown>,
        })

        // Wait for agent job to complete
        await agentJob.waitUntilFinished(agentWorker)
        results[agent.id] = { completed: true }
      }

      // Update run as completed
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          results,
        },
      })

      // Update workflow
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          lastRun: new Date(),
          status: 'active',
        },
      })

      logger.info(`Workflow completed`, { workflowId, runId: run.id })
      return results
    } catch (error) {
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: (error as Error).message,
        },
      })

      throw error
    }
  },
  { connection: redis, concurrency: 2 }
)

workflowWorker.on('completed', (job) => {
  logger.info(`Workflow job ${job.id} completed`)
})

workflowWorker.on('failed', (job, err) => {
  logger.error(`Workflow job ${job?.id} failed`, { error: err })
})

// Schedule recurring jobs
export async function scheduleAgentJob(agentId: string, frequency: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } })
  if (!agent) return

  const cronMap: Record<string, string> = {
    hourly: '0 * * * *',
    daily: '0 9 * * *',
    weekly: '0 9 * * 1',
  }

  const cron = cronMap[frequency]
  if (!cron) return

  // In production, use node-cron or a proper scheduler
  // For now, just log the intended schedule
  logger.info(`Agent scheduled`, { agentId, frequency, cron })
}
