import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import { Plan } from '@prisma/client'

interface TokenCostConfig {
  feature: string
  baseCost: number
  multiplier?: number // For variable costs (e.g., per 1000 tokens in AI response)
}

// Token cost map - adjust based on your actual AI costs
export const TOKEN_COSTS: Record<string, TokenCostConfig> = {
  'seo_audit': { feature: 'seo_audit', baseCost: 50 },
  'geo_optimization': { feature: 'geo_optimization', baseCost: 80 },
  'content_writer': { feature: 'content_writer', baseCost: 100 },
  'content_optimizer': { feature: 'content_optimizer', baseCost: 60 },
  'reddit_monitor': { feature: 'reddit_monitor', baseCost: 20 },
  'hackernews_monitor': { feature: 'hackernews_monitor', baseCost: 20 },
  'twitter_monitor': { feature: 'twitter_monitor', baseCost: 20 },
  'linkedin_monitor': { feature: 'linkedin_monitor', baseCost: 20 },
  'competitor_analysis': { feature: 'competitor_analysis', baseCost: 40 },
  'keyword_research': { feature: 'keyword_research', baseCost: 30 },
  'technical_seo': { feature: 'technical_seo', baseCost: 35 },
  'backlink_builder': { feature: 'backlink_builder', baseCost: 25 },
  'instagram_monitor': { feature: 'instagram_monitor', baseCost: 30 },
  'workflow_run': { feature: 'workflow_run', baseCost: 10 }, // Per agent in workflow
}

export class TokenService {
  // Initialize wallet for new user
  static async createWallet(userId: string, plan: Plan = Plan.free) {
    const planDef = await prisma.planDefinition.findUnique({ where: { plan } })
    
    const wallet = await prisma.tokenWallet.create({
      data: {
        userId,
        plan,
        balance: planDef?.monthlyTokens || 0,
        monthlyAllocation: planDef?.monthlyTokens || 0,
      },
    })
    
    logger.info('Token wallet created', { userId, plan, balance: wallet.balance })
    return wallet
  }

  // Check if user has enough tokens (with reservation for concurrent ops)
  static async hasTokens(userId: string, amount: number): Promise<boolean> {
    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId },
    })
    
    if (!wallet) return false
    return (wallet.balance - wallet.reserved) >= amount
  }

  // Reserve tokens before operation (prevents overspending)
  static async reserveTokens(userId: string, amount: number): Promise<boolean> {
    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId },
    })
    
    if (!wallet || (wallet.balance - wallet.reserved) < amount) {
      return false
    }
    
    await prisma.tokenWallet.update({
      where: { userId },
      data: { reserved: { increment: amount } },
    })
    
    return true
  }

  // Consume reserved tokens after successful operation
  static async consumeTokens(
    userId: string, 
    amount: number, 
    feature: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const wallet = await tx.tokenWallet.findUnique({
          where: { userId },
        })
        
        if (!wallet || wallet.reserved < amount) {
          return false
        }
        
        // Deduct from balance and reserved
        await tx.tokenWallet.update({
          where: { userId },
          data: {
            balance: { decrement: amount },
            reserved: { decrement: amount },
            totalConsumed: { increment: amount },
          },
        })
        
        // Record transaction
        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'consumption',
            amount: -amount,
            feature,
            description: `${feature} usage`,
            metadata: (metadata || {}) as any,
          },
        })
        
        return true
      })
      
      if (result) {
        logger.info('Tokens consumed', { userId, amount, feature })
      }
      
      return result
    } catch (error) {
      logger.error('Token consumption failed', { userId, amount, feature, error })
      return false
    }
  }

  // Release reserved tokens if operation fails
  static async releaseTokens(userId: string, amount: number): Promise<void> {
    await prisma.tokenWallet.update({
      where: { userId },
      data: { reserved: { decrement: amount } },
    }).catch(err => logger.error('Failed to release tokens', { userId, amount, err }))
  }

  // Calculate cost for an agent type
  static getAgentCost(agentType: string): number {
    return TOKEN_COSTS[agentType]?.baseCost || 50
  }

  // Calculate variable cost (e.g., for AI content generation based on output size)
  static calculateVariableCost(
    agentType: string, 
    outputTokens: number
  ): number {
    const config = TOKEN_COSTS[agentType]
    if (!config) return 50
    
    const multiplier = config.multiplier || 1
    return Math.ceil(config.baseCost + (outputTokens / 1000) * multiplier)
  }

  // Monthly reset (called by cron job or Stripe webhook)
  static async monthlyReset(userId: string): Promise<void> {
    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId },
      include: { user: true },
    })
    
    if (!wallet) return
    
    const planDef = await prisma.planDefinition.findUnique({
      where: { plan: wallet.plan },
    })
    
    if (!planDef) return
    
    const newAllocation = planDef.monthlyTokens
    let rolloverAmount = 0
    
    // Calculate rollover if enabled
    if (wallet.rolloverEnabled && wallet.balance > 0) {
      const maxRollover = Math.floor(newAllocation * 0.5) // Max 50% rollover
      rolloverAmount = Math.min(wallet.balance, maxRollover)
    }
    
    const newBalance = newAllocation + rolloverAmount
    
    await prisma.$transaction(async (tx) => {
      await tx.tokenWallet.update({
        where: { userId },
        data: {
          balance: newBalance,
          reserved: 0,
          monthlyAllocation: newAllocation,
          lastResetAt: new Date(),
        },
      })
      
      if (rolloverAmount > 0) {
        await tx.tokenTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'rollover',
            amount: rolloverAmount,
            description: `Rollover from previous month`,
          },
        })
      }
      
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'allocation',
          amount: newAllocation,
          description: `Monthly ${wallet.plan} plan allocation`,
        },
      })
    })
    
    logger.info('Monthly token reset', { userId, newBalance, rolloverAmount })
  }

  // Purchase tokens (one-time)
  static async purchaseTokens(
    userId: string, 
    packageId: string,
    stripePaymentIntentId?: string
  ): Promise<{ success: boolean; tokensAdded: number }> {
    const pkg = await prisma.tokenPackage.findUnique({
      where: { id: packageId },
    })
    
    if (!pkg || !pkg.isActive) {
      return { success: false, tokensAdded: 0 }
    }
    
    const wallet = await prisma.tokenWallet.findUnique({
      where: { userId },
    })
    
    if (!wallet) {
      return { success: false, tokensAdded: 0 }
    }
    
    await prisma.$transaction(async (tx) => {
      await tx.tokenWallet.update({
        where: { userId },
        data: {
          balance: { increment: pkg.tokenAmount },
          totalPurchased: { increment: pkg.tokenAmount },
        },
      })
      
      await tx.tokenTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'purchase',
          amount: pkg.tokenAmount,
          description: `Purchased ${pkg.name}`,
          metadata: {
            packageId: pkg.id,
            priceUsd: Number(pkg.priceUsd),
            stripePaymentIntentId,
          },
        },
      })
    })
    
    logger.info('Tokens purchased', { userId, packageId, tokens: pkg.tokenAmount })
    return { success: true, tokensAdded: pkg.tokenAmount }
  }

  // Get wallet with recent transactions
  static async getWalletWithHistory(userId: string, limit: number = 50) {
    return prisma.tokenWallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: limit,
        },
      },
    })
  }

  // Get usage analytics
  static async getUsageAnalytics(userId: string, days: number = 30) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    
    const transactions = await prisma.tokenTransaction.groupBy({
      by: ['feature'],
      where: {
        wallet: { userId },
        type: 'consumption',
        createdAt: { gte: since },
      },
      _sum: { amount: true },
      _count: true,
    })
    
    return transactions.map(t => ({
      feature: t.feature,
      totalTokens: Math.abs(t._sum.amount || 0),
      operationCount: t._count,
    }))
  }
}
