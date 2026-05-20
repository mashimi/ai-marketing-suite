import { Router } from 'express'
import { aiRouter } from '../services/ai-router'
import { authenticate } from '../middleware/auth'
import { logger } from '../lib/logger'

const router = Router()

// router.use(authenticate)

router.post('/generate', async (req, res) => {
  try {
    const { task, complexity, systemPrompt, userPrompt, userId, userPlan } = req.body
    const result = await aiRouter.generate({
      task,
      complexity,
      systemPrompt,
      userPrompt,
      userId,
      userPlan,
      stream: false
    })
    res.json(result)
  } catch (error) {
    logger.error('AI generation route failed', error)
    res.status(500).json({ error: 'AI generation failed' })
  }
})

router.post('/stream', async (req, res) => {
  try {
    const { task, complexity, systemPrompt, userPrompt, userId, userPlan } = req.body
    
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const stream = await aiRouter.generate({
      task,
      complexity,
      systemPrompt,
      userPrompt,
      userId,
      userPlan,
      stream: true
    }) as ReadableStream

    const reader = stream.getReader()
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    
    res.end()
  } catch (error) {
    logger.error('AI stream route failed', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI streaming failed' })
    } else {
      res.end()
    }
  }
})

export default router
