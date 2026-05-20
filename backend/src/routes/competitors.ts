import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { competitorIntelligence } from '../services/competitor/intelligence'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()

const addSchema = z.object({
  domain: z.string().min(1),
})

router.use(authenticate)

// List competitors
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { projectId } = req.query
  const competitors = await prisma.competitor.findMany({
    where: {
      projectId: projectId as string,
      project: { userId: req.user!.id }
    },
    include: {
      gaps: true,
      _count: { select: { snapshots: true, gaps: true } },
    },
    orderBy: { organicTraffic: 'desc' },
  })
  res.json(competitors)
}))

// Add & analyze competitor
router.post('/', validate(addSchema), asyncHandler(async (req: AuthRequest, res) => {
  const { domain } = req.body
  const { projectId } = req.query

  if (!projectId) throw new AppError(400, 'Project ID is required')

  const project = await prisma.project.findFirst({
    where: { id: projectId as string, userId: req.user!.id },
  })
  if (!project) throw new AppError(404, 'Project not found')

  // Check plan limits
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  const currentCount = await prisma.competitor.count({
    where: { projectId: projectId as string },
  })
  const limits = { free: 1, pro: 5, enterprise: 20 }
  const userPlan = user?.plan || 'free'
  
  if (currentCount >= (limits as any)[userPlan]) {
    throw new AppError(403, `Plan limit: ${(limits as any)[userPlan]} competitors exceeded`)
  }

  const competitor = await competitorIntelligence.analyze(
    projectId as string,
    domain,
    project.url
  )

  res.status(201).json(competitor)
}))

// Get single competitor
router.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const competitor = await prisma.competitor.findFirst({
    where: {
      id: req.params.id,
      project: { userId: req.user!.id },
    },
    include: {
      snapshots: { orderBy: { capturedAt: 'desc' }, take: 30 },
      gaps: { orderBy: { priority: 'asc' } },
    }
  })
  if (!competitor) throw new AppError(404, 'Competitor not found')
  res.json(competitor)
}))

// Re-analyze competitor
router.post('/:id/analyze', asyncHandler(async (req: AuthRequest, res) => {
  const competitor = await prisma.competitor.findFirst({
    where: {
      id: req.params.id,
      project: { userId: req.user!.id },
    },
    include: { project: true },
  })
  if (!competitor) throw new AppError(404, 'Competitor not found')

  const updated = await competitorIntelligence.analyze(
    competitor.projectId,
    competitor.domain,
    competitor.project.url
  )

  res.json(updated)
}))

// Compare multiple competitors
router.post('/compare', asyncHandler(async (req: AuthRequest, res) => {
  const { projectId, competitorIds } = req.body
  
  // Verify ownership
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user!.id }
  })
  if (!project) throw new AppError(404, 'Project not found')

  const comparison = await competitorIntelligence.compare(projectId, competitorIds)
  res.json(comparison)
}))

// Get trends
router.get('/:id/trends', asyncHandler(async (req: AuthRequest, res) => {
  const { days } = req.query
  const trends = await competitorIntelligence.getTrends(req.params.id, Number(days) || 90)
  res.json(trends)
}))

// Delete competitor
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const competitor = await prisma.competitor.findFirst({
    where: {
      id: req.params.id,
      project: { userId: req.user!.id },
    },
  })
  if (!competitor) throw new AppError(404, 'Competitor not found')

  await prisma.competitor.delete({
    where: { id: req.params.id }
  })

  res.status(204).end()
}))

export default router
