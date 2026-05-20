import { Router } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../lib/db'
import { logger } from '../lib/logger'
import { OAuth2Client } from 'google-auth-library'

const router = Router()
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/integrations/google/callback'

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
)

// Generate Google Auth URL
router.get('/google/auth-url', authenticate, (req: AuthRequest, res) => {
  try {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/webmasters.readonly', // Search Console
        'https://www.googleapis.com/auth/analytics.readonly'  // Google Analytics
      ],
      state: req.user?.id // Pass user ID through state parameter
    })
    res.json({ url })
  } catch (error) {
    logger.error('Failed to generate Google Auth URL', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Google OAuth Callback
router.post('/google/callback', authenticate, async (req: AuthRequest, res) => {
  try {
    const { code, projectId } = req.body
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    // Save to Integration table
    const integration = await prisma.integration.create({
      data: {
        userId: req.user!.id,
        projectId: projectId || null,
        provider: 'google',
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || null,
        config: {
          scope: tokens.scope,
          expiry_date: tokens.expiry_date
        }
      }
    })

    res.json({ message: 'Google integration added successfully', integration })
  } catch (error) {
    logger.error('Failed to process Google OAuth callback', { error })
    res.status(500).json({ error: 'Failed to authenticate with Google' })
  }
})

// Simple handler for adding manual webhook / platform integrations (WordPress, Meta, WhatsApp)
router.post('/manual', authenticate, async (req: AuthRequest, res) => {
  try {
    const { provider, projectId, accessToken, config, accountID, phoneNumberID } = req.body
    
    const integration = await prisma.integration.create({
      data: {
        userId: req.user!.id,
        projectId: projectId || null,
        provider,
        accessToken,
        accountID: accountID || null,
        phoneNumberID: phoneNumberID || null,
        config: config || {}
      }
    })

    res.json({ message: `${provider} integration added`, integration })
  } catch (error) {
    logger.error('Failed to add manual integration', { error })
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all integrations for a project/user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query
    const integrations = await prisma.integration.findMany({
      where: {
        userId: req.user!.id,
        ...(projectId ? { projectId: projectId as string } : {})
      }
    })
    
    // Hide access tokens before sending to client
    const safeIntegrations = integrations.map(i => ({
      ...i,
      accessToken: '***',
      refreshToken: i.refreshToken ? '***' : null
    }))

    res.json(safeIntegrations)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export { router as integrationRoutes }
