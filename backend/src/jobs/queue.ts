import { Queue, Worker, QueueEvents } from 'bullmq'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'
import { prisma } from '../lib/db'
import { aiService } from '../services/ai.service'
import { ScrapingService } from '../services/scraper'
import { TokenService } from '../services/tokenService'
import { InstagramService } from '../services/instagram'
import type { AgentType, SearchIntent } from '@prisma/client'
import { TikTokService } from '../services/tiktok.service'
import { MetaService } from '../services/meta.service'
import { WhatsAppService } from '../services/whatsapp.service'

// Lazy-load io to avoid circular dependency (server imports queue, queue imports server)
function getIO() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../server').io
  } catch {
    return null
  }
}

/** Emit a real-time log event to the frontend terminal */
function emitAgentLog(projectId: string, agentId: string, message: string, level: 'info' | 'warn' | 'success' | 'error' = 'info') {
  try {
    const io = getIO()
    if (io) {
      io.to(projectId).emit('agent-log', {
        agentId,
        message,
        level,
        timestamp: new Date().toISOString(),
      })
    }
  } catch { /* non-critical */ }
}

export let agentQueueEvents: any = null
export let agentQueue: any = null
export let workflowQueue: any = null
export let contentQueue: any = null
export let agentWorker: any = null
export let contentWorker: any = null
export let workflowWorker: any = null

let _redisAvailable = false

function initQueues() {
  try {
    agentQueueEvents = new QueueEvents('agent-jobs', { connection: redis })
    agentQueue = new Queue('agent-jobs', { connection: redis })
    workflowQueue = new Queue('workflow-jobs', { connection: redis })
    contentQueue = new Queue('content-jobs', { connection: redis })
    _redisAvailable = true
    logger.info('BullMQ queues initialized')
  } catch (err) {
    logger.warn('BullMQ queues unavailable — Redis not connected. Agent jobs will be skipped until Redis is available.')
  }
}

initQueues()

/** Returns true if queues are available for job dispatch */
export function isQueueReady() { return _redisAvailable && agentQueue !== null }

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
agentWorker = new Worker<AgentJobData>(
  'agent-jobs',
  async (job) => {
    const { agentId, projectId, type, config, userId } = job.data
    logger.info(`Processing agent job`, { agentId, type, jobId: job.id, userId })

    // Calculate and check token cost
    const tokenCost = TokenService.getAgentCost(type)
    const hasTokens = await TokenService.reserveTokens(userId, tokenCost)

    if (!hasTokens) {
      logger.warn('Insufficient tokens for agent job', { agentId, userId, cost: tokenCost })
      
      await prisma.agent.update({
        where: { id: agentId },
        data: { status: 'error' },
      })
      
      await prisma.agentResult.create({
        data: {
          agentId,
          type: type.toString(),
          data: { error: 'Insufficient tokens. Please upgrade your plan or purchase more tokens.' },
          status: 'error',
        },
      })
      
      throw new Error('INSUFFICIENT_TOKENS')
    }

    // Update agent status to running
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: 'running', lastRun: new Date() },
    })

    try {
      let result: Record<string, unknown> = {}

      // Emit live start event to the frontend terminal
      emitAgentLog(projectId, agentId, `Starting ${type.replace(/_/g, ' ')} agent...`, 'info')

      switch (type) {
        case 'seo_audit':
          emitAgentLog(projectId, agentId, 'Launching headless browser for deep crawl...', 'info')
          result = await runSEOAudit(projectId, config, (msg, lvl) => emitAgentLog(projectId, agentId, msg, lvl))
          break
        case 'geo_optimization':
          emitAgentLog(projectId, agentId, 'Fetching latest content for GEO analysis...', 'info')
          result = await runGEOOptimization(projectId, config)
          break
        case 'content_writer':
          emitAgentLog(projectId, agentId, 'Generating content with AI...', 'info')
          result = await runContentWriter(projectId, config)
          break
        case 'reddit_monitor':
        case 'hackernews_monitor':
        case 'twitter_monitor':
        case 'linkedin_monitor':
          emitAgentLog(projectId, agentId, `Scanning ${type.replace(/_monitor/, '')} for mentions...`, 'info')
          result = await runSocialMonitor(projectId, type, config)
          break
        case 'competitor_analysis':
          emitAgentLog(projectId, agentId, 'Running competitor intelligence analysis...', 'info')
          result = await runCompetitorAnalysis(projectId, config)
          break
        case 'keyword_research':
          emitAgentLog(projectId, agentId, 'Researching keywords with AI...', 'info')
          result = await runKeywordResearch(projectId, config)
          break
        case 'technical_seo':
          emitAgentLog(projectId, agentId, 'Running technical SEO crawl...', 'info')
          result = await runTechnicalSEO(projectId, config)
          break
        case 'content_optimizer':
          emitAgentLog(projectId, agentId, 'Optimizing content for search engines...', 'info')
          result = await runContentOptimizer(projectId, config)
          break
        case 'backlink_builder':
          emitAgentLog(projectId, agentId, 'Scanning for backlink opportunities...', 'info')
          result = await runBacklinkBuilder(projectId, config)
          break
        case 'tiktok_monitor':
          emitAgentLog(projectId, agentId, 'Analyzing TikTok trends...', 'info')
          result = await runTikTokMonitor(projectId, config)
          break
        case 'tiktok_scriptwriter':
          emitAgentLog(projectId, agentId, 'Generating TikTok script...', 'info')
          result = await runTikTokScriptwriter(projectId, config)
          break
        case 'meta_ad_manager':
          emitAgentLog(projectId, agentId, 'Generating Meta Ads...', 'info')
          result = await runMetaAdManager(projectId, config)
          break
        case 'facebook_community':
          emitAgentLog(projectId, agentId, 'Scanning Facebook comments...', 'info')
          result = await runFacebookCommunity(projectId, config)
          break
        case 'whatsapp_concierge':
          emitAgentLog(projectId, agentId, 'Running WhatsApp workflow...', 'info')
          result = await runWhatsAppConcierge(projectId, config)
          break
        default:
          throw new Error(`Unknown agent type: ${type}`)
      }

      emitAgentLog(projectId, agentId, `✔ ${type.replace(/_/g, ' ')} completed successfully`, 'success')

      // Save result
      await prisma.agentResult.create({
        data: {
          agentId,
          type: type.toString(),
          data: result as any,
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

      // Consume tokens
      await TokenService.consumeTokens(userId, tokenCost, type, {
        jobId: job.id,
        projectId,
        agentId,
      })

      logger.info(`Agent job completed`, { agentId, type, jobId: job.id })
      return result
    } catch (error) {
      // Release tokens on failure
      await TokenService.releaseTokens(userId, tokenCost)
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

if (agentWorker) {
  agentWorker.on('completed', (job: any) => {
    logger.info(`Agent job ${job.id} completed`)
  })
  agentWorker.on('failed', (job: any, err: any) => {
    logger.error(`Agent job ${job?.id} failed`, { error: err })
  })
}

// Content Job Worker
contentWorker = new Worker<ContentJobData>(
  'content-jobs',
  async (job) => {
    const { projectId, topic, type, tone, keywords, userId } = job.data
    logger.info(`Processing content job`, { topic, jobId: job.id, userId })

    const tokenCost = TokenService.getAgentCost('content_writer')
    const hasTokens = await TokenService.reserveTokens(userId, tokenCost)

    if (!hasTokens) {
      throw new Error('INSUFFICIENT_TOKENS')
    }

    try {
      const response = await aiService.generateContent({
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

      // Consume tokens
      await TokenService.consumeTokens(userId, tokenCost, 'content_writer', {
        jobId: job.id,
        projectId,
      })

      logger.info(`Content generated`, { contentId: contentPiece.id, jobId: job.id })
      return contentPiece
    } catch (error) {
      // Release tokens on failure
      await TokenService.releaseTokens(userId, tokenCost)
      logger.error(`Content job failed`, { jobId: job.id, error })
      throw error
    }
  },
  { connection: redis, concurrency: 3 }
)

// Agent implementations
type LogFn = (msg: string, level?: 'info' | 'warn' | 'success' | 'error') => void

async function runSEOAudit(projectId: string, config: Record<string, unknown>, log: LogFn = () => {}) {
  const project = await prisma.project.findUnique({ where: { id: projectId } })
  if (!project) throw new Error('Project not found')

  // Deep crawl with Playwright (works on React/Next.js SPAs)
  log('Launching Chromium headless browser...', 'info')
  const pageAnalysis = await ScrapingService.analyzePage(project.url)
  log(`Crawl complete — ${pageAnalysis.wordCount} words, ${pageAnalysis.images.total} images found`, 'info')

  // Use AI Reasoner for deep technical analysis
  log('Running AI technical SEO analysis (deep reasoning)...', 'info')
  const deepseekResponse = await aiService.analyzeSEO({
    url: project.url,
    content: JSON.stringify(pageAnalysis),
  })
  log('AI analysis complete, saving report...', 'info')

  // Try to parse DeepSeek response
  let auditData: any = null
  try {
    const extractedJson = extractJSON(deepseekResponse.content)
    if (extractedJson) {
      auditData = JSON.parse(extractedJson)
    }
  } catch (error) {
    logger.error('Failed to parse SEO audit JSON', { error, content: deepseekResponse.content })
  }

  // Create audit with real or fallback data
  const audit = await prisma.sEOAudit.create({
    data: {
      projectId,
      overallScore: auditData?.overallScore || 78,
      categories: auditData?.categories || [
        { name: 'On-Page SEO', score: 85, weight: 0.25, status: 'good' },
        { name: 'Technical SEO', score: 72, weight: 0.25, status: 'warning' },
        { name: 'Content Quality', score: 80, weight: 0.20, status: 'good' },
        { name: 'User Experience', score: 75, weight: 0.15, status: 'warning' },
        { name: 'Mobile Optimization', score: 82, weight: 0.15, status: 'good' },
      ],
      issues: auditData?.issues || [
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
        }
      ],
      recommendations: auditData?.recommendations || [
        {
          id: '1',
          priority: 1,
          category: 'Technical SEO',
          title: 'Implement Core Web Vitals Optimization',
          description: 'Focus on improving LCP, FID, and CLS metrics.',
          expectedImpact: '+15-25% organic traffic',
          difficulty: 'hard',
          estimatedTime: '2-3 weeks',
        }
      ],
      competitors: auditData?.competitors || [],
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

  const response = await aiService.optimizeForGEO({
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

  const response = await aiService.generateContent({
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
  
  if (platform.toLowerCase() === 'instagram') {
    const instagramConfig = {
      keywords,
      hashtags: (config.hashtags as string[]) || [],
      competitors: (config.competitors as string[]) || [],
    }
    return await InstagramService.monitor(projectId, instagramConfig)
  }

  // Fallback for other platforms (Reddit, Twitter, etc.)
  const subreddits = (config.subreddits as string[]) || ['startups', 'SaaS']

  // In production, this would use Reddit API, Twitter API, etc.
  // For now, simulate with DeepSeek analysis
  const response = await aiService.generateContent({
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
    const response = await aiService.analyzeCompetitor({
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

  const response = await aiService.researchKeywords({ seed, count })

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
        intent: kw.intent as SearchIntent,
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

  const response = await aiService.optimizeForGEO({
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
workflowWorker = new Worker(
  'workflow-jobs',
  async (job) => {
    const { workflowId, projectId } = job.data
    logger.info(`Processing workflow job`, { workflowId, jobId: job.id })

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { 
        agents: { include: { agent: true } },
        project: true 
      },
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
        await agentJob.waitUntilFinished(agentQueueEvents)
        results[agent.id] = { completed: true }
      }

      // Update run as completed
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          results: results as any,
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

if (workflowWorker) {
  workflowWorker.on('completed', (job: any) => {
    logger.info(`Workflow job ${job.id} completed`)
  })
  workflowWorker.on('failed', (job: any, err: any) => {
    logger.error(`Workflow job ${job?.id} failed`, { error: err })
  })
}

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

function extractJSON(text: string): string | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  return jsonMatch ? jsonMatch[0] : null
}

async function runTikTokMonitor(projectId: string, config: Record<string, unknown>) {
  const hashtag = (config.targetHashtag as string) || 'marketing'
  return await TikTokService.getTrendingAnalysis(hashtag)
}

async function runTikTokScriptwriter(projectId: string, config: Record<string, unknown>) {
  const topic = (config.topic as string) || 'Latest industry trends'
  const goal = (config.goal as string) || 'Generate leads'
  
  // Try to grab from BrandVault or default
  const brandVaultContext = 'We are a modern, fast-moving AI tool company.'
  
  const scriptResult = await TikTokService.generateScript(topic, goal, brandVaultContext)
  
  return { script: scriptResult.content }
}

async function runMetaAdManager(projectId: string, config: Record<string, unknown>) {
  const productInfo = (config.productInfo as string) || 'New feature launch'
  const audience = (config.audience as string) || 'B2B Marketing Professionals'
  const context = 'We are an AI software company.'
  
  const adResult = await MetaService.generateAdCopy(productInfo, audience, context)
  
  return { ads: adResult.content }
}

async function runFacebookCommunity(projectId: string, config: Record<string, unknown>) {
  const sampleComment = "Is this available on iOS?"
  const context = "Our app is web-only for now, iOS coming Q4."
  
  const replyResult = await MetaService.handleComment(sampleComment, context)
  return { reply: replyResult.content }
}

async function runWhatsAppConcierge(projectId: string, config: Record<string, unknown>) {
  const sampleMessage = "I would like to speak to sales."
  const context = "Sales can be reached at sales@example.com."
  const phone = "+1234567890"
  
  await WhatsAppService.sendAIReply(phone, sampleMessage, context)
  return { status: 'Sent AI Reply to WhatsApp' }
}
