import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import { validate } from '../middleware/validation'
import { asyncHandler } from '../middleware/error'
import { AppError } from '../middleware/error'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new AppError(401, 'Invalid credentials')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new AppError(401, 'Invalid credentials')
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    logger.info('User logged in', { userId: user.id })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    })
  })
)

router.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new AppError(409, 'Email already registered')
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      },
    })

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    logger.info('User registered', { userId: user.id })

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan,
        createdAt: user.createdAt,
      },
    })
  })
)

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      throw new AppError(401, 'Authentication required')
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        plan: true,
        createdAt: true,
      },
    })

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    res.json(user)
  })
)

export default router
