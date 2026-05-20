import { Router } from 'express'
import { z } from 'zod'
import Stripe from 'stripe'
import { prisma } from '../lib/db'
import { TokenService } from '../services/tokenService'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'
import { logger } from '../lib/logger'

const stripeKey = process.env.STRIPE_SECRET_KEY
const stripe: any = stripeKey && stripeKey !== 'sk_test_51P...'
  ? new Stripe(stripeKey, { apiVersion: '2025-04-15' as any })
  : null
const router = Router()

// Public: Get token packages and plans
router.get('/plans', asyncHandler(async (req, res) => {
  const [plans, packages] = await Promise.all([
    prisma.planDefinition.findMany({ where: { isActive: true }, orderBy: { monthlyTokens: 'asc' } }),
    prisma.tokenPackage.findMany({ where: { isActive: true }, orderBy: { tokenAmount: 'asc' } }),
  ])
  
  res.json({ plans, packages })
}))

// Get current user's wallet
router.get('/wallet', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const wallet = await TokenService.getWalletWithHistory(req.user!.id, 20)
  
  if (!wallet) {
    // Create wallet if missing
    const newWallet = await TokenService.createWallet(req.user!.id, req.user!.plan as any)
    return res.json(newWallet)
  }
  
  res.json(wallet)
}))

// Get usage analytics
router.get('/usage', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const days = parseInt(req.query.days as string) || 30
  const analytics = await TokenService.getUsageAnalytics(req.user!.id, days)
  res.json(analytics)
}))

// Create checkout session for token purchase
router.post('/checkout', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  if (!stripe) {
    throw new AppError(503, 'Payment service is not configured')
  }

  const schema = z.object({
    packageId: z.string().optional(),
    planId: z.string().optional(),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  })
  
  const { packageId, planId, successUrl, cancelUrl } = schema.parse(req.body)
  
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  let wallet = await prisma.tokenWallet.findUnique({ where: { userId: req.user!.id } })
  
  let customerId = wallet?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user!.email,
      name: user!.name,
      metadata: { userId: user!.id },
    })
    customerId = customer.id
    
    if (!wallet) {
      wallet = await TokenService.createWallet(user!.id, user!.plan as any)
    }
    
    await prisma.tokenWallet.update({
      where: { userId: user!.id },
      data: { stripeCustomerId: customerId },
    })
  }
  
  const lineItems: any[] = []
  
  if (packageId) {
    const pkg = await prisma.tokenPackage.findUnique({ where: { id: packageId } })
    if (!pkg) throw new AppError(404, 'Package not found')
    
    lineItems.push({
      price: pkg.stripePriceId!,
      quantity: 1,
    })
  }
  
  if (planId) {
    const plan = await prisma.planDefinition.findUnique({ where: { plan: planId as any } })
    if (!plan) throw new AppError(404, 'Plan not found')
    
    lineItems.push({
      price: plan.stripePriceId!,
      quantity: 1,
    })
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: lineItems,
    mode: planId ? 'subscription' : 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId: user!.id,
      packageId: packageId || '',
      planId: planId || '',
    },
  })
  
  res.json({ sessionId: session.id, url: session.url })
}))

// Stripe webhook handler
router.post('/webhook', asyncHandler(async (req, res) => {
  if (!stripe) {
    throw new AppError(503, 'Payment service is not configured')
  }

  const sig = req.headers['stripe-signature'] as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!
  
  let event: any
  
  try {
    event = stripe.webhooks.constructEvent((req as any).rawBody, sig, endpointSecret)
  } catch (err: any) {
    logger.error(`Webhook Signature Error: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const { userId, packageId, planId } = session.metadata || {}
      
      if (!userId) break
      
      if (packageId) {
        await TokenService.purchaseTokens(userId, packageId, session.payment_intent as string)
      }
      
      if (planId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        
        await prisma.tokenWallet.update({
          where: { userId },
          data: {
            plan: planId as any,
            stripeSubscriptionId: subscription.id,
          },
        })
        
        await prisma.user.update({
          where: { id: userId },
          data: { plan: planId as any },
        })
        
        await TokenService.monthlyReset(userId)
      }
      break
    }
    
    case 'invoice.paid': {
      const invoice = event.data.object as any
      const subscriptionId = invoice.subscription as string
      
      if (subscriptionId) {
        const wallet = await prisma.tokenWallet.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })
        
        if (wallet) {
          await TokenService.monthlyReset(wallet.userId)
        }
      }
      break
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any
      const wallet = await prisma.tokenWallet.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      })
      
      if (wallet) {
        await prisma.tokenWallet.update({
          where: { id: wallet.id },
          data: { plan: 'free' },
        })
        
        await prisma.user.update({
          where: { id: wallet.userId },
          data: { plan: 'free' },
        })
      }
      break
    }
  }
  
  res.json({ received: true })
}))

// Get customer portal session
router.post('/portal', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  if (!stripe) {
    throw new AppError(503, 'Payment service is not configured')
  }

  const wallet = await prisma.tokenWallet.findUnique({
    where: { userId: req.user!.id },
  })
  
  if (!wallet?.stripeCustomerId) {
    throw new AppError(400, 'No billing account found')
  }
  
  const session = await stripe.billingPortal.sessions.create({
    customer: wallet.stripeCustomerId,
    return_url: req.body.returnUrl || `${process.env.FRONTEND_URL}/settings?tab=billing`,
  })
  
  res.json({ url: session.url })
}))

export default router