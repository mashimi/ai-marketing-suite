import { Router, Response } from 'express'
import { prisma } from '../lib/db'
import { swarmOrchestrator } from '../services/swarm/orchestrator'
import { swarmQueue } from '../lib/queues'
import { requireTokens } from '../middleware/billing'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validation'
import { asyncHandler, AppError } from '../middleware/error'
import { SwarmMessage } from '@prisma/client'

const router = Router()

const createSwarmSchema = z.object({
  name: z.string().min(1),
  goal: z.string().min(1),
  strategy: z.enum(['sequential', 'parallel', 'debate', 'hierarchical']).default('sequential'),
  projectId: z.string(),
  members: z.array(z.object({
    agentId: z.string(),
    role: z.enum(['coordinator', 'researcher', 'executor', 'critic', 'optimizer']),
    order: z.number().optional(),
    canDelegate: z.boolean().optional(),
  })).min(2),
})

router.use(authenticate)

// Create a new swarm
router.post('/', validate(createSwarmSchema), asyncHandler(async (req: AuthRequest, res: Response) => {
  const swarm = await swarmOrchestrator.createSwarm(req.body)
  res.status(201).json(swarm)
}))

// List swarms for a project
router.get('/project/:projectId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const swarms = await prisma.swarm.findMany({
    where: { 
      projectId: req.params.projectId,
      project: { userId: req.user!.id }
    },
    include: { 
      members: { include: { agent: true } },
      _count: { select: { sessions: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
  res.json(swarms)
}))

// Execute a swarm (asynchronous)
router.post('/:swarmId/execute', requireTokens('workflow_run'), asyncHandler(async (req: AuthRequest, res: Response) => {
  const { input } = req.body
  const swarmId = req.params.swarmId

  const swarm = await prisma.swarm.findFirst({
    where: { id: swarmId, project: { userId: req.user!.id } }
  })

  if (!swarm) throw new AppError(404, 'Swarm not found')

  await prisma.swarm.update({
    where: { id: swarmId },
    data: { status: 'running' }
  })

  const job = await swarmQueue.add(`swarm-${swarmId}`, { 
    swarmId, 
    input,
    userId: req.user!.id
  })
  
  res.json({ 
    message: 'Swarm execution started', 
    jobId: job.id 
  })
}))

// Get swarm sessions
router.get('/:swarmId/sessions', asyncHandler(async (req: AuthRequest, res: Response) => {
  const sessions = await prisma.swarmSession.findMany({
    where: { 
      swarmId: req.params.swarmId,
      swarm: { project: { userId: req.user!.id } }
    },
    include: { 
      _count: { select: { messages: true, artifacts: true } }
    },
    orderBy: { startedAt: 'desc' }
  })
  res.json(sessions)
}))

// Get session details (messages, artifacts, memory)
router.get('/sessions/:sessionId', asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.swarmSession.findUnique({
    where: { id: req.params.sessionId },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
      artifacts: true,
      swarm: {
        include: {
          memory: true
        }
      }
    }
  })
  
  if (!session) throw new AppError(404, 'Session not found')
  res.json(session)
}))

// SSE endpoint for live swarm updates
router.get('/sessions/:sessionId/stream', asyncHandler(async (req: AuthRequest, res: Response) => {
  const session = await prisma.swarmSession.findUnique({
    where: { id: req.params.sessionId },
    include: { swarm: { include: { project: true } } }
  })

  if (!session) throw new AppError(404, 'Session not found')
  if (session.swarm.project.userId !== req.user!.id) throw new AppError(403, 'Forbidden')

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const send = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // Send existing messages
  const messages = await prisma.swarmMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' }
  })
  messages.forEach((m: SwarmMessage) => send({ type: 'message', data: m }))

  // Subscribe to new messages
  const handler = (msg: any) => send({ type: 'message', data: msg })
  await swarmOrchestrator.subscribeToSession(session.id, handler)

  req.on('close', () => {
    // Redis cleanup handled in orchestrator or automatically
  })
}))

// Delete swarm
router.delete('/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  const swarm = await prisma.swarm.findUnique({
    where: { id: req.params.id },
    include: { project: true }
  })

  if (!swarm) throw new AppError(404, 'Swarm not found')
  if (swarm.project.userId !== req.user!.id) throw new AppError(403, 'Forbidden')

  await prisma.swarm.delete({
    where: { id: req.params.id }
  })

  res.status(204).send()
}))

export default router
