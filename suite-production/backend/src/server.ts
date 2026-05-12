import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

dotenv.config()

import { logger } from './lib/logger'
import { errorHandler } from './middleware/error'

// Routes
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import agentRoutes from './routes/agents'
import seoRoutes from './routes/seo'
import contentRoutes from './routes/content'
import socialRoutes from './routes/social'
import keywordRoutes from './routes/keywords'
import analyticsRoutes from './routes/analytics'
import workflowRoutes from './routes/workflows'
import notificationRoutes from './routes/notifications'

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { error: 'Too many requests, please try again later.' },
})

app.use('/api/', limiter)

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}))

app.use(compression())

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/agents', agentRoutes)
app.use('/api/seo', seoRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/keywords', keywordRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/workflows', workflowRoutes)
app.use('/api/notifications', notificationRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
