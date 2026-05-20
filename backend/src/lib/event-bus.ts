import { redis, createRedisConnection, isRedisReady } from './redis'
import { logger } from './logger'
import { prisma } from './db'

export interface AppEvent {
  type: string
  payload: Record<string, any>
  timestamp: string
  id: string
}

export class EventBus {
  private subscribers: Map<string, ((event: AppEvent) => Promise<void>)[]> = new Map()

  async publish(type: string, payload: Record<string, any>, userId?: string, projectId?: string): Promise<void> {
    const fullEvent: AppEvent = {
      type,
      payload,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
    }

    try {
      // Publish to Redis for cross-process communication (only when connected)
      if (isRedisReady()) {
        await redis.xadd('app:events', '*', 'data', JSON.stringify(fullEvent))
      }

      // Log to database for audit trail
      await prisma.eventLog.create({
        data: {
          type,
          payload: { ...payload, eventId: fullEvent.id },
          userId,
          projectId,
        }
      })

      // Local dispatch
      this.dispatch(fullEvent)

      logger.debug('Event published', { type: fullEvent.type })
    } catch (error) {
      logger.error('Failed to publish event', { error, type })
    }
  }

  subscribe(eventType: string, handler: (event: AppEvent) => Promise<void>): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, [])
    }
    this.subscribers.get(eventType)!.push(handler)
  }

  private dispatch(event: AppEvent): void {
    const handlers = this.subscribers.get(event.type) || []
    handlers.forEach(handler => {
      handler(event).catch(err => logger.error('Event handler failed', { error: err, type: event.type }))
    })
  }

  // Worker to process Redis streams
  async startConsumer(groupName: string = 'workers'): Promise<void> {
    // Skip consumer entirely if Redis is not available
    if (!isRedisReady()) {
      logger.warn('Event consumer skipped — Redis not available. Events will be dispatched locally only.')
      return
    }

    const consumerRedis = createRedisConnection()

    consumerRedis.on('error', (err) => {
      const msg = err.message || ''
      if (!msg.includes('ENOTFOUND') && !msg.includes('ECONNREFUSED')) {
        logger.error('Event Bus Consumer Redis error:', err)
      }
    })

    try {
      await consumerRedis.xgroup('CREATE', 'app:events', groupName, '$', 'MKSTREAM')
    } catch (e: any) {
      if (!e.message.includes('BUSYGROUP')) {
        logger.warn('Failed to create Redis stream group — running without stream consumer', e.message)
        return
      }
    }

    logger.info(`Event consumer started for group: ${groupName}`)

    while (true) {
      try {
        const results = (await consumerRedis.xreadgroup(
          'GROUP', groupName, 'worker-1',
          'BLOCK', 5000,
          'STREAMS', 'app:events', '>'
        )) as any

        if (results) {
          for (const [stream, messages] of results) {
            for (const [id, [fieldName, data]] of messages) {
              try {
                const event = JSON.parse(data) as AppEvent
                this.dispatch(event)
                await consumerRedis.xack('app:events', groupName, id)
              } catch (parseError) {
                logger.error('Failed to process stream message', { id, parseError })
              }
            }
          }
        }
      } catch (error: any) {
        const msg = error?.message || ''
        if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
          logger.warn('Event consumer: Redis unreachable, stopping consumer loop.')
          return // Stop the infinite loop gracefully
        }
        logger.error('Event consumer error', { error })
        await new Promise(r => setTimeout(r, 2000))
      }
    }
  }
}

export const eventBus = new EventBus()

// Wire up core event handlers
eventBus.subscribe('agent.completed', async (event) => {
  const { agentId, projectId, result } = event.payload
  
  // Update agent status and metrics
  await prisma.agent.update({
    where: { id: agentId },
    data: { 
      status: 'idle',
      lastRun: new Date(),
    }
  })

  // Create notification
  await prisma.notification.create({
    data: {
      userId: event.payload.userId,
      type: 'success',
      title: 'Agent Task Completed',
      message: `Agent ${agentId} finished its task successfully.`,
      actionUrl: `/projects/${projectId}/agents/${agentId}`
    }
  })
})

eventBus.subscribe('content.published', async (event) => {
  const { contentId, url, platform } = event.payload
  
  await prisma.contentPiece.update({
    where: { id: contentId },
    data: { 
      status: 'published',
      publishedAt: new Date()
    }
  })
  
  logger.info('Content auto-update completed after publish', { contentId, platform })
})
