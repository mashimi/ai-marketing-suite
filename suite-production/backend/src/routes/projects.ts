import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  description: z.string().optional(),
})

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const projects = await prisma.project.findMany({
      where: { userId: req.user!.id },
      include: {
        _count: {
          select: {
            agents: true,
            content: true,
            workflows: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    res.json(projects)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      include: {
        agents: {
          include: { metrics: true },
        },
        _count: {
          select: {
            agents: true,
            content: true,
            workflows: true,
            keywords: true,
          },
        },
      },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    res.json(project)
  })
)

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { name, url, description } = req.body

    // Check plan limits
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { _count: { select: { projects: true } } },
    })

    const planLimits: Record<string, number> = {
      free: 1,
      pro: 5,
      enterprise: 100,
    }

    if (user && user._count.projects >= planLimits[user.plan]) {
      throw new AppError(403, `Plan limit reached: ${user.plan} plan allows ${planLimits[user.plan]} projects`)
    }

    const project = await prisma.project.create({
      data: {
        name,
        url,
        description,
        userId: req.user!.id,
      },
    })

    res.status(201).json(project)
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const project = await prisma.project.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      data: req.body,
    })

    if (project.count === 0) {
      throw new AppError(404, 'Project not found')
    }

    res.json({ success: true })
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const project = await prisma.project.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (project.count === 0) {
      throw new AppError(404, 'Project not found')
    }

    res.json({ success: true })
  })
)

export default router
