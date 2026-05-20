import dotenv from 'dotenv'
import Redis, { RedisOptions } from 'ioredis'
import { logger } from './logger'

// Load .env synchronously before anything else reads process.env
dotenv.config()

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

let _errorCount = 0
const MAX_LOGGED_ERRORS = 3 // Only log first N repeated connection errors

// Improved configuration for local and remote Redis services
export const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required for BullMQ compatibility
  enableReadyCheck: false,
  family: 4, // Force IPv4 to prevent IPv6 ETIMEDOUT issues with Node > 18
  // Explicitly enable TLS if using a rediss:// URL
  tls: redisUrl.startsWith('rediss://') ? {
    rejectUnauthorized: false,
  } : undefined,
  // Connection stability improvements
  connectTimeout: 10000,
  keepAlive: 30000,
  lazyConnect: true, // Don't throw on startup if Redis is unavailable
  retryStrategy(times) {
    // Cap retry delay at 10s; stop after 20 failed attempts to avoid log flooding
    if (times > 20) {
      logger.warn(`Redis: giving up after ${times} connection attempts. App will continue without Redis.`)
      return null // Stop retrying
    }
    return Math.min(times * 500, 10000)
  },
  reconnectOnError(err) {
    const message = err.message
    if (message.includes('ECONNRESET') || message.includes('READONLY') || message.includes('ETIMEDOUT')) {
      return true
    }
    return false
  }
}

// Main redis instance for general use (non-blocking)
export const redis = new Redis(redisUrl, redisOptions)

// Factory function for creating additional connections (needed for blocking commands)
export const createRedisConnection = () => new Redis(redisUrl, redisOptions)

redis.on('error', (err) => {
  // Suppress repetitive ENOTFOUND/ECONNREFUSED spam after a threshold
  const isDnsError = err.message?.includes('ENOTFOUND') || err.message?.includes('ECONNREFUSED')
  if (isDnsError) {
    _errorCount++
    if (_errorCount <= MAX_LOGGED_ERRORS) {
      logger.error(`Redis connection error (attempt ${_errorCount}): ${err.message}`)
    } else if (_errorCount === MAX_LOGGED_ERRORS + 1) {
      logger.warn('Redis: suppressing further repeated connection errors. Check REDIS_URL in .env')
    }
    // Don't rethrow — let the app continue
    return
  }
  logger.error('Redis error:', err)
})

redis.on('connect', () => {
  _errorCount = 0 // Reset on successful connection
  logger.info('Redis connected')
})

/** Returns true only when Redis is in a fully usable state */
export function isRedisReady(): boolean {
  return redis.status === 'ready'
}

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...')
})

