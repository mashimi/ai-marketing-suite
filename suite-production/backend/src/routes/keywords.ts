import { Router } from 'express'
import { prisma } from '../lib/db'
import { agentQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.query

    const keywords = await prisma.keyword.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(keywords)
  })
)

router.post(
  '/research',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId, seed } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Find or create keyword research agent
    let agent = await prisma.agent.findFirst({
      where: {
        projectId,
        type: 'keyword_research',
      },
    })

    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: 'Keyword Research Agent',
          type: 'keyword_research',
          status: 'idle',
          description: 'Discover high-value keywords and opportunities',
          icon: 'Key',
          frequency: 'manual',
          projectId,
          config: { seed },
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

    const job = await agentQueue.add(`keyword-${agent.id}`, {
      agentId: agent.id,
      projectId,
      userId: req.user!.id,
      type: 'keyword_research',
      config: { seed },
    })

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'running', lastRun: new Date() },
    })

    res.json({ success: true, jobId: job.id, agentId: agent.id })
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const keyword = await prisma.keyword.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!keyword) {
      throw new AppError(404, 'Keyword not found')
    }

    const updated = await prisma.keyword.update({
      where: { id: req.params.id },
      data: req.body,
    })

    res.json(updated)
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const keyword = await prisma.keyword.deleteMany({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (keyword.count === 0) {
      throw new AppError(404, 'Keyword not found')
    }

    res.json({ success: true })
  })
)

export default router
