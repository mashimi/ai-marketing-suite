import 'dotenv/config' // MUST be first — loads .env before any other module initializes
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'

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
import reportRoutes from './routes/reports'
import aiRoutes from './routes/ai'
import swarmRoutes from './routes/swarms'
import competitorRoutes from './routes/competitors'
import billingRoutes from './routes/billing'
import geoRoutes from './routes/geo'
import { integrationRoutes } from './routes/integrations'
import { eventBus } from './lib/event-bus'
import { prisma } from './lib/db'
import './workers/swarm.worker' // Initialize worker
import { initCronJobs } from './jobs/cron'

initCronJobs()

const app = express()
const httpServer = createServer(app)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
]

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
})
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin '${origin}' not allowed`))
  },
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
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    if (req.originalUrl?.startsWith('/api/billing/webhook')) {
      req.rawBody = buf
    }
  }
}))
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
app.use('/api/reports', reportRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/swarms', swarmRoutes)
app.use('/api/competitors', competitorRoutes)
app.use('/api/billing', billingRoutes)
app.use('/api/geo', geoRoutes)
app.use('/api/integrations', integrationRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`)

  socket.on('join_project', (projectId: string) => {
    socket.join(`project:${projectId}`)
    logger.info(`Socket ${socket.id} joined project: ${projectId}`)
  })

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`)
  })
})

// Attach io to the app for use in routes
app.set('io', io)

// Export io so BullMQ workers can emit real-time events
export { io }

httpServer.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)

  // Start event bus consumer in the background
  eventBus.startConsumer().catch(err => logger.error('Event bus consumer failed', err))
})

export default app
