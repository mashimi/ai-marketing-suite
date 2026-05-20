import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis'
import { logger } from '../lib/logger'
import { swarmOrchestrator } from '../services/swarm/orchestrator'
import { TokenService } from '../services/tokenService'

let swarmWorker: Worker | null = null

try {
  swarmWorker = new Worker(
    'swarm-execution',
    async (job) => {
      const { swarmId, input, userId } = job.data
      logger.info('Starting swarm background job', { jobId: job.id, swarmId, userId })

      const tokenCost = TokenService.getAgentCost('workflow_run')

      try {
        await swarmOrchestrator.execute(swarmId, input)
        
        if (userId) {
          await TokenService.consumeTokens(userId, tokenCost, 'workflow_run', {
            jobId: job.id,
            swarmId
          })
        }
        
        logger.info('Swarm background job completed', { jobId: job.id, swarmId })
      } catch (error) {
        if (userId) {
          await TokenService.releaseTokens(userId, tokenCost)
        }
        logger.error('Swarm background job failed', { jobId: job.id, swarmId, error })
        throw error
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: 5,
    }
  )

  swarmWorker.on('failed', (job, err) => {
    logger.error(`Swarm job ${job?.id} failed: ${err.message}`)
  })

  swarmWorker.on('completed', (job) => {
    logger.info(`Swarm job ${job.id} completed successfully`)
  })

  logger.info('Swarm worker initialized')
} catch (err) {
  logger.warn('Swarm worker unavailable — Redis not connected. Swarm background jobs will be skipped.')
}

export { swarmWorker }
