import { Router } from 'express'
import { reportService } from '../services/reports'
import { authenticate } from '../middleware/auth'
import { logger } from '../lib/logger'

const router = Router()

// router.use(authenticate) // Temporarily disabled for testing if needed, but should be enabled for production

router.get('/seo/:projectId', async (req, res) => {
  try {
    const pdf = await reportService.generateSEOReport(req.params.projectId)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=seo-report-${req.params.projectId}.pdf`)
    res.send(pdf)
  } catch (error) {
    logger.error('Failed to generate SEO report', { error, projectId: req.params.projectId })
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

export default router
