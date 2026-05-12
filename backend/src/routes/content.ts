import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { contentQueue } from '../jobs/queue'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['blog', 'social', 'email', 'landing', 'ad']),
  content: z.string(),
  keywords: z.array(z.string()).default([]),
  projectId: z.string(),
})

const generateSchema = z.object({
  topic: z.string().min(1),
  type: z.enum(['blog', 'social', 'email', 'landing']),
  tone: z.string().default('professional'),
  keywords: z.array(z.string()).default([]),
  projectId: z.string(),
})

router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId } = req.query

    const content = await prisma.contentPiece.findMany({
      where: {
        project: {
          userId: req.user!.id,
          ...(projectId && { id: projectId as string }),
        },
      },
      include: { engagement: true },
      orderBy: { createdAt: 'desc' },
    })

    res.json(content)
  })
)

router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const content = await prisma.contentPiece.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
      include: { engagement: true },
    })

    if (!content) {
      throw new AppError(404, 'Content not found')
    }

    res.json(content)
  })
)

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { title, type, content, keywords, projectId } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
      include: { _count: { select: { content: true } } },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Check plan limits
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    const planLimits: Record<string, number> = {
      free: 5,
      pro: 50,
      enterprise: 1000,
    }

    if (user && project._count.content >= planLimits[user.plan]) {
      throw new AppError(403, `Plan limit reached`)
    }

    const piece = await prisma.contentPiece.create({
      data: {
        title,
        type,
        status: 'draft',
        content,
        keywords,
        projectId,
      },
    })

    res.status(201).json(piece)
  })
)

router.post(
  '/generate',
  validate(generateSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { topic, type, tone, keywords, projectId } = req.body

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    // Queue content generation
    const job = await contentQueue.add(`content-${projectId}`, {
      projectId,
      topic,
      type,
      tone,
      keywords,
      userId: req.user!.id,
    })

    res.json({ success: true, jobId: job.id, message: 'Content generation queued' })
  })
)

router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const content = await prisma.contentPiece.findFirst({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (!content) {
      throw new AppError(404, 'Content not found')
    }

    const updated = await prisma.contentPiece.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedAt: new Date(),
        ...(req.body.status === 'published' && { publishedAt: new Date() }),
      },
      include: { engagement: true },
    })

    res.json(updated)
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const content = await prisma.contentPiece.deleteMany({
      where: {
        id: req.params.id,
        project: { userId: req.user!.id },
      },
    })

    if (content.count === 0) {
      throw new AppError(404, 'Content not found')
    }

    res.json({ success: true })
  })
)

export default router
