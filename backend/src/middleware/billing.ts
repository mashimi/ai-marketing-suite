import { Request, Response, NextFunction } from 'express'
import { TokenService } from '../services/tokenService'
import { logger } from '../lib/logger'
import { AuthRequest } from './auth'

// Extend AuthRequest to include token context
export interface BillingRequest extends AuthRequest {
  tokenReservation?: {
    amount: number
    feature: string
  }
}

// Middleware: Check and reserve tokens before expensive operations
export const requireTokens = (feature: string, getCost?: (req: Request) => number) => {
  return async (req: BillingRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Calculate cost
      const cost = getCost ? getCost(req) : TokenService.getAgentCost(feature)
      
      // Check and reserve
      const hasTokens = await TokenService.reserveTokens(userId, cost)
      if (!hasTokens) {
        return res.status(402).json({ 
          error: 'Insufficient tokens',
          code: 'INSUFFICIENT_TOKENS',
          required: cost,
          feature,
          upgradeUrl: '/settings?tab=billing'
        })
      }
      
      // Store reservation for later consumption/release
      req.tokenReservation = { amount: cost, feature }
      
      next()
    } catch (error) {
      logger.error('Token check failed', { error, userId: req.user?.id })
      res.status(500).json({ error: 'Billing check failed' })
    }
  }
}

// Middleware: Consume reserved tokens after successful operation
export const consumeReservedTokens = async (
  req: BillingRequest, 
  res: Response, 
  next: NextFunction
) => {
  // Override res.json to intercept successful responses
  const originalJson = res.json.bind(res)
  
  res.json = function(body: any) {
    // Only consume on success (2xx status)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.tokenReservation) {
      const { amount, feature } = req.tokenReservation
      TokenService.consumeTokens(
        req.user!.id, 
        amount, 
        feature,
        { endpoint: req.path, method: req.method }
      ).catch(err => logger.error('Token consumption failed', err))
    } else if (req.tokenReservation) {
      // Release on failure
      const { amount } = req.tokenReservation
      TokenService.releaseTokens(req.user!.id, amount).catch(() => {})
    }
    
    return originalJson(body)
  }
  
  next()
}
