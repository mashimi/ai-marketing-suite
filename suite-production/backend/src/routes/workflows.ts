import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { workflowQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  agents: z.array(z.string()).min(1),
  trigger: z.enum(['manual', 'scheduled', 'event']).default('manual'),
  schedule: z.string().optional(),
  projectId: z.string(),
})

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.query

    const workflows = await prisma.workflow.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
      },
      include: {
        agents: {
          include: { agent: true },
        },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(workflows)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
      include: {
        agents: {
          include: { agent: true },
        },
        runs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!workflow) {
      throw new AppError(404, 'Workflow not found')
    }

    res.json(workflow)
  })
)

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, description, agents, trigger, schedule, projectId } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
      include: { _count: { select: { workflows: true } } },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    const planLimits: Record<string, number> = {
      free: 1,
      pro: 10,
      enterprise: 100,
    }

    if (user && project._count.workflows >= planLimits[user.plan]) {
      throw new AppError(403, `Plan limit reached`)
    }

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description,
        trigger,
        schedule,
        status: 'active',
        projectId,
        agents: {
          create: agents.map((agentId: string) => ({
            agent: { connect: { id: agentId } },
          })),
        },
      },
      include: {
        agents: {
          include: { agent: true },
        },
      },
    })

    res.status(201).json(workflow)
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!workflow) {
      throw new AppError(404, 'Workflow not found')
    }

    const updated = await prisma.workflow.update({
      where: { id: req.params.id },
      data: req.body,
      include: {
        agents: {
          include: { agent: true },
        },
      },
    })

    res.json(updated)
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const workflow = await prisma.workflow.deleteMany({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (workflow.count === 0) {
      throw new AppError(404, 'Workflow not found')
    }

    res.json({ success: true })
  })
)

router.post(
  '/:id/run',
  asyncHandler(async (req: AuthRequest, res) => {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
      include: { agents: true },
    })

    if (!workflow) {
      throw new AppError(404, 'Workflow not found')
    }

    if (workflow.status !== 'active') {
      throw new AppError(409, 'Workflow is not active')
    }

    const job = await workflowQueue.add(`workflow-${workflow.id}`, {
      workflowId: workflow.id,
      projectId: workflow.projectId,
      userId: req.user!.id,
    })

    res.json({ success: true, jobId: job.id })
  })
)

export default router
