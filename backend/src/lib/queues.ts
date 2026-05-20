import { Queue } from 'bullmq'
import { createRedisConnection } from './redis'
import { logger } from './logger'

let swarmQueue: Queue | null = null

try {
  swarmQueue = new Queue('swarm-execution', {
    connection: createRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: true,
    }
  })
} catch (err) {
  logger.warn('swarmQueue unavailable — Redis not connected. Swarm jobs will be skipped.')
}

export { swarmQueue }
