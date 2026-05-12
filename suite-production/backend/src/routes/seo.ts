import { Router } from 'express'
import { prisma } from '../lib/db'
import { agentQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()
router.use(authenticate)

router.post(
  '/audit',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Find or create SEO audit agent
    let agent = await prisma.agent.findFirst({
      where: {
        projectId,
        type: 'seo_audit',
      },
    })

    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          name: 'SEO Audit Agent',
          type: 'seo_audit',
          status: 'idle',
          description: 'Comprehensive website SEO analysis',
          icon: 'Search',
          frequency: 'manual',
          projectId,
          config: { depth: 'comprehensive' },
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

    // Queue the job
    const job = await agentQueue.add(`seo-audit-${agent.id}`, {
      agentId: agent.id,
      projectId,
      userId: req.user!.id,
      type: 'seo_audit',
      config: agent.config as Record<string, unknown>,
    })

    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'running', lastRun: new Date() },
    })

    res.json({ success: true, jobId: job.id, agentId: agent.id })
  })
)

router.get(
  '/audit/:auditId',
  asyncHandler(async (req: AuthRequest, res) => {
    const audit = await prisma.sEOAudit.findFirst({
      where: {
        id: req.params.auditId,
        project: { userId: req.user!.id },
      },
    })

    if (!audit) {
      throw new AppError(404, 'Audit not found')
    }

    res.json(audit)
  })
)

router.get(
  '/audits',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.query

    const audits = await prisma.sEOAudit.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    })

    res.json(audits)
  })
)

export default router
