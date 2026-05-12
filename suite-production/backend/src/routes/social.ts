import { Router } from 'express'
import { prisma } from '../lib/db'
import { agentQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()
router.use(authenticate)

router.get(
  '/monitor',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId, platform } = req.query

    const monitor = await prisma.socialMonitor.findFirst({
      where: {
        project: {
          userId: req.user!.id,
          id: projectId as string,
        },
        platform: platform as string,
      },
      orderBy: { updatedAt: 'desc' },
    })

    if (!monitor) {
      // Return empty structure
      return res.json({
        platform: platform || 'reddit',
        keywords: [],
        mentions: [],
        trending: [],
        sentiment: {
          positive: 0,
          neutral: 0,
          negative: 0,
          overall: 0,
          trend: 'stable',
        },
      })
    }

    res.json(monitor)
  })
)

router.get(
  '/mentions',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId, platform } = req.query

    const monitors = await prisma.socialMonitor.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
        ...(platform && { platform: platform as string }),
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })

    const allMentions = monitors.flatMap((m) => m.mentions as any[])
    res.json(allMentions)
  })
)

router.post(
  '/monitor',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId, platform, keywords } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Find or create social monitor agent
    const agentTypeMap: Record<string, string> = {
      reddit: 'reddit_monitor',
      hackernews: 'hackernews_monitor',
      twitter: 'twitter_monitor',
      linkedin: 'linkedin_monitor',
    }

    let agent = await prisma.agent.findFirst({
      where: {
        projectId,
        type: agentTypeMap[platform] as any,
      },
    })

    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Monitor`,
          type: agentTypeMap[platform] as any,
          status: 'idle',
          description: `Monitor ${platform} for mentions and trends`,
          icon: 'MessageSquare',
          frequency: 'hourly',
          projectId,
          config: { keywords, platform },
          metrics: {
            create: {
              tasksCompleted: 0,
              successRate: 100,
              avgExecutionTime: 0,
              impactScore: 0,
            },
          },
        },
      })
    }

    // Queue monitoring job
    const job = await agentQueue.add(`social-${agent.id}`, {
      agentId: agent.id,
      projectId,
      userId: req.user!.id,
      type: agent.type,
      config: { keywords, platform },
    })

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'running' },
    })

    res.json({ success: true, jobId: job.id, agentId: agent.id })
  })
)

export default router
