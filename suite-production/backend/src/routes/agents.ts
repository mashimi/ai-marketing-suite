import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { agentQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum([
    'seo_audit',
    'geo_optimization',
    'content_writer',
    'reddit_monitor',
    'hackernews_monitor',
    'twitter_monitor',
    'linkedin_monitor',
    'competitor_analysis',
    'keyword_research',
    'backlink_builder',
    'technical_seo',
    'content_optimizer',
  ]),
  description: z.string(),
  icon: z.string().default('Sparkles'),
  frequency: z.enum(['manual', 'hourly', 'daily', 'weekly']).default('manual'),
  projectId: z.string(),
  config: z.record(z.any()).default({}),
})

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.query

    const agents = await prisma.agent.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
      },
      include: {
        metrics: true,
        results: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(agents)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
      include: {
        metrics: true,
        results: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
    })

    if (!agent) {
      throw new AppError(404, 'Agent not found')
    }

    res.json(agent)
  })
)

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, type, description, icon, frequency, projectId, config } = req.body

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
      include: { _count: { select: { agents: true } } },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    const planLimits: Record<string, number> = {
      free: 3,
      pro: 15,
      enterprise: 100,
    }

    if (user && project._count.agents >= planLimits[user.plan]) {
      throw new AppError(403, `Plan limit reached: ${user.plan} plan allows ${planLimits[user.plan]} agents`)
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        type,
        status: 'idle',
        description,
        icon,
        frequency,
        projectId,
        config,
        metrics: {
          create: {
            tasksCompleted: 0,
            successRate: 100,
            avgExecutionTime: 0,
            impactScore: 0,
          },
        },
      },
      include: { metrics: true },
    })

    res.status(201).json(agent)
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!agent) {
      throw new AppError(404, 'Agent not found')
    }

    const updated = await prisma.agent.update({
      where: { id: req.params.id },
      data: req.body,
      include: { metrics: true },
    })

    res.json(updated)
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await prisma.agent.deleteMany({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (agent.count === 0) {
      throw new AppError(404, 'Agent not found')
    }

    res.json({ success: true })
  })
)

router.post(
  '/:id/run',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!agent) {
      throw new AppError(404, 'Agent not found')
    }

    if (agent.status === 'running') {
      throw new AppError(409, 'Agent is already running')
    }

    // Add to queue
    const job = await agentQueue.add(`agent-${agent.id}`, {
      agentId: agent.id,
      projectId: agent.projectId,
      userId: req.user!.id,
      type: agent.type,
      config: agent.config as Record<string, unknown>,
    })

    // Update status
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'running', lastRun: new Date() },
    })

    res.json({ success: true, jobId: job.id })
  })
)

router.post(
  '/:id/stop',
  asyncHandler(async (req: AuthRequest, res) => {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!agent) {
      throw new AppError(404, 'Agent not found')
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'paused' },
    })

    res.json({ success: true })
  })
)

export default router
