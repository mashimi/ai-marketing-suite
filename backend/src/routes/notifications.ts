import { Router } from 'express'
import { prisma } from '../lib/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    res.json(notifications)
  })
)

router.patch(
  '/:id/read',
  asyncHandler(async (req: AuthRequest, res) => {
    const notification = await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      data: { read: true },
    })

    if (notification.count === 0) {
      throw new AppError(404, 'Notification not found')
    }

    res.json({ success: true })
  })
)

router.patch(
  '/read-all',
  asyncHandler(async (req: AuthRequest, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    })

    res.json({ success: true })
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    const notification = await prisma.notification.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    })

    if (notification.count === 0) {
      throw new AppError(404, 'Notification not found')
    }

    res.json({ success: true })
  })
)

export default router
