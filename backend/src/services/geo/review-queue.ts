import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'
import { DeepSeekService } from '../deepseek'

type SeverityLevel = 'low' | 'medium' | 'high'
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'auto_applied'

interface ContentClassification {
  category: string
  severity: SeverityLevel
  reasoning: string
  riskFactors: string[]
}

export class GEOReviewQueue {
  /**
   * Classify content severity based on topic, category, and risk factors
   * Low risk (blog posts): Auto-apply with notification
   * Medium risk (product pages): Require approval
   * High risk (YMYL content): Block auto-optimization
   */
  static async classifyContent(content: string): Promise<ContentClassification> {
    // Check for YMYL (Your Money Your Life) keywords first
    const ymylPatterns = [
      /\b(health|medical|diagnosis|treatment|surgery|medication|disease|cancer|therapy)\b/i,
      /\b(financial|investment|stock|retirement|loan|mortgage|insurance|tax)\b/i,
      /\b(legal|attorney|lawyer|court|lawsuit|settlement|contract)\b/i,
      /\b(safety|emergency|first.?aid|poison|overdose|suicide)\b/i,
      /\b(pregnancy|childbirth|vaccine|immunization|prescription)\b/i,
    ]

    const productPagePatterns = [
      /\b(buy|purchase|order|price|pricing|cost|checkout|cart)\b/i,
      /\b(product|service|feature|specification|warranty|guarantee)\b/i,
      /\b(demo|trial|subscription|plan|upgrade|downgrade)\b/i,
    ]

    const blogPatterns = [
      /\b(guide|tutorial|how.?to|tips|best practices|overview)\b/i,
      /\b(blog|article|news|update|announcement|release)\b/i,
      /\b(opinion|thoughts|perspective|analysis|review)\b/i,
    ]

    // Count matches per category
    const ymylMatches = ymylPatterns.reduce((sum, p) => sum + (p.test(content) ? 1 : 0), 0)
    const productMatches = productPagePatterns.reduce((sum, p) => sum + (p.test(content) ? 1 : 0), 0)
    const blogMatches = blogPatterns.reduce((sum, p) => sum + (p.test(content) ? 1 : 0), 0)

    let severity: SeverityLevel = 'low'
    let category = 'general'
    const riskFactors: string[] = []

    if (ymylMatches >= 2) {
      severity = 'high'
      category = 'ymyl'
      riskFactors.push('YMYL content detected')
      if (/\b(health|medical|diagnosis|treatment)/i.test(content)) {
        riskFactors.push('Health/medical advice - requires expert review')
      }
      if (/\b(financial|investment|retirement)/i.test(content)) {
        riskFactors.push('Financial advice - regulatory considerations')
      }
    } else if (productMatches >= 2) {
      severity = 'medium'
      category = 'product'
      riskFactors.push('Product page optimization - may affect conversions')
    } else if (blogMatches >= 2) {
      severity = 'low'
      category = 'blog'
    }

    // Check for additional risk factors
    if (/\b(statistics|data|study|research|findings)\b/i.test(content) && /\b(202[0-9]|203[0-9])\b/.test(content)) {
      riskFactors.push('Contains time-sensitive statistics/data')
    }
    if (/\b(patent|copyright|trademark|confidential|proprietary)\b/i.test(content)) {
      riskFactors.push('Contains IP/legal references')
    }
    if (/\b(testimonial|customer.?review|rating|case.?study)\b/i.test(content)) {
      riskFactors.push('Contains customer testimonials - accuracy must be verified')
    }

    const reasoning = severity === 'high'
      ? `High risk: ${riskFactors.join('; ')}. Requires human review before any optimization.`
      : severity === 'medium'
        ? `Medium risk: ${riskFactors.join('; ')}. Optimization requires approval.`
        : `Low risk content. Can auto-apply with notification.`

    return { category, severity, reasoning, riskFactors }
  }

  /**
   * Add optimization to review queue
   */
  static async addToQueue(params: {
    projectId: string
    contentId: string
    query: string
    originalContent: string
    optimizedContent: string
    changesSummary: Record<string, unknown>
  }): Promise<{ id: string; severity: SeverityLevel; autoApplied: boolean }> {
    const classification = await this.classifyContent(params.originalContent)
    const autoApplied = classification.severity === 'low'

    const reviewItem = await prisma.gEOReviewQueue.create({
      data: {
        projectId: params.projectId,
        contentId: params.contentId,
        query: params.query,
        originalContent: params.originalContent,
        optimizedContent: params.optimizedContent,
        changesSummary: params.changesSummary as any,
        severity: classification.severity,
        status: autoApplied ? 'auto_applied' : 'pending',
        autoApplied,
      }
    })

    if (autoApplied) {
      // Actually apply the optimization to the content
      await prisma.contentPiece.update({
        where: { id: params.contentId },
        data: {
          content: params.optimizedContent,
          updatedAt: new Date()
        }
      })

      logger.info(`Auto-applied GEO optimization [${reviewItem.id}] for content ${params.contentId}`)
    } else {
      logger.info(`Added to review queue [${reviewItem.id}] severity=${classification.severity} for content ${params.contentId}`)
    }

    return {
      id: reviewItem.id,
      severity: classification.severity,
      autoApplied
    }
  }

  /**
   * Review and approve/reject queued optimization
   */
  static async reviewItem(
    itemId: string,
    userId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<void> {
    const item = await prisma.gEOReviewQueue.findUnique({
      where: { id: itemId }
    })
    if (!item) throw new Error('Review item not found')

    if (action === 'approve') {
      // Apply the optimization
      if (item.contentId) {
        await prisma.contentPiece.update({
          where: { id: item.contentId },
          data: {
            content: item.optimizedContent,
            updatedAt: new Date()
          }
        })
      }

      await prisma.gEOReviewQueue.update({
        where: { id: itemId },
        data: {
          status: 'approved',
          reviewedBy: userId,
          reviewedAt: new Date()
        }
      })

      logger.info(`GEO optimization approved [${itemId}] by user ${userId}`)
    } else {
      await prisma.gEOReviewQueue.update({
        where: { id: itemId },
        data: {
          status: 'rejected',
          reviewedBy: userId,
          reviewedAt: new Date()
        }
      })

      logger.info(`GEO optimization rejected [${itemId}] by user ${userId}`)
    }
  }

  /**
   * Get pending review items for a project
   */
  static async getPendingReviews(
    projectId: string,
    severity?: SeverityLevel
  ): Promise<any[]> {
    const where: any = {
      projectId,
      status: 'pending'
    }
    if (severity) where.severity = severity

    const items = await prisma.gEOReviewQueue.findMany({
      where,
      orderBy: [
        { severity: 'desc' }, // High severity first
        { createdAt: 'asc' }
      ],
      take: 50
    })

    return items.map((item: any) => ({
      id: item.id,
      query: item.query,
      severity: item.severity,
      status: item.status,
      changesSummary: item.changesSummary,
      createdAt: item.createdAt,
      originalPreview: item.originalContent.slice(0, 500),
      optimizedPreview: item.optimizedContent.slice(0, 500),
      diffStats: this.computeDiffStats(item.originalContent, item.optimizedContent)
    }))
  }

  /**
   * Compute basic diff statistics between original and optimized content
   */
  private static computeDiffStats(original: string, optimized: string): {
    lengthChange: number
    percentChange: number
    sectionCountChange: number
  } {
    const origSections = (original.match(/##+\s/g) || []).length
    const optSections = (optimized.match(/##+\s/g) || []).length
    const lengthChange = optimized.length - original.length
    const percentChange = original.length > 0
      ? Math.round((lengthChange / original.length) * 1000) / 10
      : 0

    return {
      lengthChange,
      percentChange,
      sectionCountChange: optSections - origSections
    }
  }

  /**
   * Get review queue statistics for dashboard
   */
  static async getQueueStats(projectId: string): Promise<{
    pendingCount: number
    approvedCount: number
    rejectedCount: number
    autoAppliedCount: number
    bySeverity: Record<string, number>
    avgReviewTime: number | null
  }> {
    const items = await prisma.gEOReviewQueue.findMany({
      where: { projectId }
    })

    const stats = {
      pendingCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      autoAppliedCount: 0,
      bySeverity: { low: 0, medium: 0, high: 0 } as Record<string, number>,
      avgReviewTime: null as number | null
    }

    let totalReviewTime = 0
    let reviewedCount = 0

    for (const item of items) {
      stats.bySeverity[item.severity as SeverityLevel] = (stats.bySeverity[item.severity as SeverityLevel] || 0) + 1
      
      if (item.status === 'pending') stats.pendingCount++
      else if (item.status === 'approved') {
        stats.approvedCount++
        if (item.reviewedAt) {
          totalReviewTime += item.reviewedAt.getTime() - item.createdAt.getTime()
          reviewedCount++
        }
      }
      else if (item.status === 'rejected') {
        stats.rejectedCount++
        if (item.reviewedAt) {
          totalReviewTime += item.reviewedAt.getTime() - item.createdAt.getTime()
          reviewedCount++
        }
      }
      else if (item.status === 'auto_applied') stats.autoAppliedCount++
    }

    if (reviewedCount > 0) {
      stats.avgReviewTime = Math.round(totalReviewTime / reviewedCount / 1000 / 60) // minutes
    }

    return stats
  }

  /**
   * Get a diff summary for the review UI
   */
  static async getDiffSummary(itemId: string): Promise<{
    additions: string[]
    removals: string[]
    unchanged: string
  }> {
    const item = await prisma.gEOReviewQueue.findUnique({
      where: { id: itemId }
    })
    if (!item) throw new Error('Review item not found')

    // Simple line-by-line diff
    const origLines = item.originalContent.split('\n')
    const optLines = item.optimizedContent.split('\n')

    const additions: string[] = []
    const removals: string[] = []
    
    const origSet = new Set(origLines.map((l: string) => l.trim()))
    const optSet = new Set(optLines.map((l: string) => l.trim()))

    for (const line of optLines) {
      if (!origSet.has(line.trim())) {
        additions.push(line)
      }
    }

    for (const line of origLines) {
      if (!optSet.has(line.trim())) {
        removals.push(line)
      }
    }

    // Isolate unchanged portions for context
    const unchangedLines = optLines.filter((l: string) => origSet.has(l.trim()))
    const unchanged = unchangedLines.length > 0
      ? unchangedLines.slice(0, 20).join('\n') + (unchangedLines.length > 20 ? '\n...' : '')
      : ''

    return { additions, removals, unchanged }
  }
}