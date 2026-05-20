import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { requireTokens } from '../middleware/billing'
import { GEOMonitor } from '../services/geoMonitor'
import { GEOCitationIndex } from '../services/geo/citation-index'
import { GEOEntityAnalyzer } from '../services/geo/entity-analyzer'
import { GEOABTest } from '../services/geo/ab-test'
import { GEOReviewQueue } from '../services/geo/review-queue'
import { logger } from '../lib/logger'
import { prisma } from '../lib/db'

const router = Router()

// All GEO routes require authentication
router.use(authenticate)

// --- Helper: Validate project ownership ---
async function validateProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId }
  })
  if (!project) throw new Error('Project not found')
  return project
}

// --- Dashboard ---

// Get overall GEO health dashboard for a project
router.get('/dashboard/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)
    const dashboard = await GEOMonitor.getGEOHealthDashboard(projectId)
    res.json(dashboard)
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('GEO dashboard error', { error })
    res.status(500).json({ error: 'Failed to retrieve GEO dashboard' })
  }
})

// --- Ranking Checks ---

// Trigger a ranking check for specific queries
router.post('/check-rankings', async (req: any, res) => {
  try {
    const { projectId, queries, platforms } = req.body

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: 'At least one query is required' })
    }
    if (queries.some((q: any) => typeof q !== 'string' || q.length > 200)) {
      return res.status(400).json({ error: 'Invalid query format' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const validPlatforms = ['chatgpt', 'claude', 'perplexity', 'gemini']
    const selectedPlatforms = Array.isArray(platforms) 
      ? platforms.filter((p: string) => validPlatforms.includes(p))
      : validPlatforms

    if (selectedPlatforms.length === 0) {
      return res.status(400).json({ error: 'No valid platforms specified' })
    }

    const allResults = []
    for (const query of queries) {
      const results = await GEOMonitor.checkRanking(projectId, query, selectedPlatforms)
      allResults.push(...results)
    }

    res.json({ success: true, results: allResults })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('GEO check ranking error', { error })
    res.status(500).json({ error: 'Failed to check rankings' })
  }
})

// --- Recommendations ---

// Get AI optimization recommendations for a specific query
router.get('/recommendations', async (req: any, res) => {
  try {
    const { projectId, query, platform } = req.query

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }
    if (!query || typeof query !== 'string' || query.length > 200) {
      return res.status(400).json({ error: 'Valid query is required' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const recommendations = await GEOMonitor.getOptimizationRecommendations(
      projectId, 
      query, 
      typeof platform === 'string' ? platform : undefined
    )

    res.json(recommendations)
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('GEO recommendations error', { error })
    res.status(500).json({ error: 'Failed to retrieve recommendations' })
  }
})

// --- Optimization ---

// Apply auto-optimization to a specific piece of content
router.post('/optimize/apply', async (req: any, res) => {
  try {
    const { projectId, contentId, query } = req.body

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }
    if (!contentId || typeof contentId !== 'string') {
      return res.status(400).json({ error: 'Content ID is required' })
    }
    if (!query || typeof query !== 'string' || query.length > 200) {
      return res.status(400).json({ error: 'Valid query is required' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const result = await GEOMonitor.applyOptimization(projectId, contentId, query)
    res.json(result)
  } catch (error: any) {
    if (error?.message === 'Project not found' || error?.message === 'Content not found') {
      return res.status(404).json({ error: error.message })
    }
    logger.error('GEO auto-optimize error', { error })
    res.status(500).json({ error: 'Failed to apply optimization' })
  }
})

// Run auto-optimize on all top opportunities
router.post('/optimize/auto', async (req: any, res) => {
  try {
    const { projectId, limit } = req.body

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const optLimit = typeof limit === 'number' ? Math.min(Math.max(1, limit), 20) : 5
    const results = await GEOMonitor.autoOptimizeAll(projectId, optLimit)
    res.json({ success: true, results })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('GEO auto-optimize all error', { error })
    res.status(500).json({ error: 'Failed to run auto-optimization' })
  }
})

// --- Citation Index ---

// Get citation index for a project
router.get('/citations/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)
    const citationIndex = await GEOCitationIndex.buildCitationIndex(projectId)
    const citationRate = await GEOCitationIndex.getCitationRate(projectId)

    res.json({ citationIndex, citationRate })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Citation index error', { error })
    res.status(500).json({ error: 'Failed to retrieve citation index' })
  }
})

// Scrape citations for a query
router.post('/citations/scrape', async (req: any, res) => {
  try {
    const { projectId, query, platform } = req.body

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const targetPlatform = platform || 'perplexity'
    const citations = await GEOCitationIndex.scrapeCitations(projectId, query, targetPlatform)
    await GEOCitationIndex.recordCitations(projectId, targetPlatform, query, citations)

    res.json({ success: true, citations, count: citations.length })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Citation scrape error', { error })
    res.status(500).json({ error: 'Failed to scrape citations' })
  }
})

// --- Entity Analysis ---

// Get entity coverage analysis
router.get('/entities/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)
    const entityAnalysis = await GEOEntityAnalyzer.analyzeEntityCoverage(projectId)

    res.json(entityAnalysis)
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Entity analysis error', { error })
    res.status(500).json({ error: 'Failed to retrieve entity analysis' })
  }
})

// Trigger entity coverage update
router.post('/entities/update', async (req: any, res) => {
  try {
    const { projectId } = req.body
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    await validateProjectAccess(projectId, req.user.id)
    await GEOEntityAnalyzer.updateOurEntityCoverage(projectId)

    res.json({ success: true, message: 'Entity coverage updated' })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Entity update error', { error })
    res.status(500).json({ error: 'Failed to update entity coverage' })
  }
})

// --- A/B Testing ---

// Get A/B test results
router.get('/ab-tests/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)
    const tests = await GEOABTest.getTestResults(projectId)

    res.json(tests)
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('A/B test results error', { error })
    res.status(500).json({ error: 'Failed to retrieve A/B test results' })
  }
})

// Run A/B test measurement round
router.post('/ab-tests/measure', async (req: any, res) => {
  try {
    const { projectId } = req.body
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    await validateProjectAccess(projectId, req.user.id)
    await GEOABTest.runMeasurementRound(projectId)

    res.json({ success: true, message: 'Measurement round completed' })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('A/B test measurement error', { error })
    res.status(500).json({ error: 'Failed to run measurement round' })
  }
})

// Create A/B test manually
router.post('/ab-tests/create', async (req: any, res) => {
  try {
    const { projectId, contentId, query, originalContent, optimizedContent, changesApplied, variantName } = req.body

    if (!projectId || !contentId || !query || !originalContent || !optimizedContent) {
      return res.status(400).json({ error: 'Missing required fields: projectId, contentId, query, originalContent, optimizedContent' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const test = await GEOABTest.createTest({
      projectId,
      contentId,
      query,
      originalContent,
      optimizedContent,
      changesApplied: changesApplied || {},
      variantName: variantName || 'manual-optimized'
    })

    res.json({ success: true, testId: test.testId, baselineId: test.baselineId })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('A/B test creation error', { error })
    res.status(500).json({ error: 'Failed to create A/B test' })
  }
})

// --- Review Queue ---

// Get pending reviews
router.get('/reviews/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    const { severity } = req.query

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const validSeverities = ['low', 'medium', 'high']
    const severityFilter = typeof severity === 'string' && validSeverities.includes(severity)
      ? severity as 'low' | 'medium' | 'high'
      : undefined

    const reviews = await GEOReviewQueue.getPendingReviews(projectId, severityFilter)
    const queueStats = await GEOReviewQueue.getQueueStats(projectId)

    res.json({ items: reviews, stats: queueStats })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Review queue error', { error })
    res.status(500).json({ error: 'Failed to retrieve reviews' })
  }
})

// Review an optimization item (approve/reject)
router.post('/reviews/review', async (req: any, res) => {
  try {
    const { itemId, action, notes } = req.body

    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Item ID is required' })
    }
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "approve" or "reject"' })
    }

    await GEOReviewQueue.reviewItem(itemId, req.user.id, action as 'approve' | 'reject', notes)

    res.json({ success: true, message: `Optimization ${action}d` })
  } catch (error: any) {
    if (error?.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    logger.error('Review action error', { error })
    res.status(500).json({ error: 'Failed to process review' })
  }
})

// Get diff summary for a review item
router.get('/reviews/diff/:itemId', async (req: any, res) => {
  try {
    const { itemId } = req.params
    if (!itemId || typeof itemId !== 'string') {
      return res.status(400).json({ error: 'Invalid item ID' })
    }

    const diff = await GEOReviewQueue.getDiffSummary(itemId)
    res.json(diff)
  } catch (error: any) {
    if (error?.message?.includes('not found')) {
      return res.status(404).json({ error: error.message })
    }
    logger.error('Diff summary error', { error })
    res.status(500).json({ error: 'Failed to get diff summary' })
  }
})

// --- Query Clustering ---

// Cluster queries for a project
router.post('/cluster', async (req: any, res) => {
  try {
    const { projectId } = req.body
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' })
    }

    await validateProjectAccess(projectId, req.user.id)
    await GEOMonitor.clusterQueries(projectId)

    res.json({ success: true, message: 'Queries clustered' })
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Query clustering error', { error })
    res.status(500).json({ error: 'Failed to cluster queries' })
  }
})

// Get query clusters
router.get('/clusters/:projectId', async (req: any, res) => {
  try {
    const { projectId } = req.params
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Invalid project ID' })
    }

    await validateProjectAccess(projectId, req.user.id)

    const clusters = await prisma.gEOQueryCluster.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' }
    })

    res.json(clusters)
  } catch (error: any) {
    if (error?.message === 'Project not found') {
      return res.status(404).json({ error: 'Project not found' })
    }
    logger.error('Query clusters fetch error', { error })
    res.status(500).json({ error: 'Failed to retrieve clusters' })
  }
})

export default router