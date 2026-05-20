import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'
import { GEOCitationIndex } from './citation-index'
import { DeepSeekService } from '../deepseek'

interface ABTestConfig {
  projectId: string
  contentId: string
  query: string
  originalContent: string
  optimizedContent: string
  changesApplied: Record<string, unknown>
  variantName: string
}

export class GEOABTest {
  /**
   * Create a new A/B test (shadow testing)
   * Runs original vs optimized in parallel to measure actual citation rates
   */
  static async createTest(config: ABTestConfig) {
    // Create the test
    const test = await prisma.gEOABTest.create({
      data: {
        projectId: config.projectId,
        contentId: config.contentId,
        query: config.query,
        status: 'running',
        startedAt: new Date()
      }
    })

    // Create baseline variant (original content)
    const baseline = await prisma.gEOABTestVariant.create({
      data: {
        testId: test.id,
        variantName: 'baseline',
        originalContent: config.originalContent,
        optimizedContent: config.originalContent, // same for baseline
        changesApplied: {},
        baselinePosition: null,
        citationRate: 0,
        statisticalSignificance: 0
      }
    })

    // Create optimized variant
    await prisma.gEOABTestVariant.create({
      data: {
        testId: test.id,
        variantName: config.variantName || 'optimized',
        originalContent: config.originalContent,
        optimizedContent: config.optimizedContent,
        changesApplied: (config.changesApplied || {}) as any,
        baselinePosition: null,
        citationRate: 0,
        statisticalSignificance: 0
      }
    })

    // Start initial measurement
    await this.measureVariant(test.id, baseline.id, config.projectId, config.query)
    
    logger.info(`A/B test created: ${test.id} for query "${config.query}"`)
    return { testId: test.id, baselineId: baseline.id }
  }

  /**
   * Measure citation rates for a variant by scraping citations
   */
  static async measureVariant(
    testId: string,
    variantId: string,
    projectId: string,
    query: string
  ): Promise<void> {
    try {
      const citations = await GEOCitationIndex.scrapeCitations(projectId, query, 'perplexity')
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { url: true }
      })
      if (!project) throw new Error('Project not found')

      const projectDomain = new URL(project.url).hostname
      const ourCitations = citations.filter(c => c.citedDomain === projectDomain).length
      const citationRate = citations.length > 0 ? ourCitations / citations.length : 0

      await prisma.gEOABTestVariant.update({
        where: { id: variantId },
        data: {
          citationRate,
          currentPosition: citations.find(c => c.citedDomain === projectDomain)?.position || 99
        }
      })
    } catch (err) {
      logger.error(`A/B test measurement failed for variant ${variantId}`, { error: err })
    }
  }

  /**
   * Run a measurement round for all active test variants
   */
  static async runMeasurementRound(projectId: string): Promise<void> {
    const activeTests = await prisma.gEOABTest.findMany({
      where: { projectId, status: 'running' },
      include: { variants: true }
    })

    for (const test of activeTests) {
      for (const variant of test.variants) {
        await this.measureVariant(
          test.id,
          variant.id,
          projectId,
          test.query
        )
      }

      // Check if we have enough data to conclude
      await this.analyzeResults(test.id)
    }
  }

  /**
   * Analyze A/B test results with statistical significance
   */
  static async analyzeResults(testId: string): Promise<{
    concluded: boolean
    winnerId?: string
    significance: number
  }> {
    const test = await prisma.gEOABTest.findUnique({
      where: { id: testId },
      include: { variants: true }
    })
    if (!test) throw new Error('Test not found')

    const variants = test.variants
    if (variants.length < 2) return { concluded: false, significance: 0 }

    const baseline = variants.find((v: { variantName: string }) => v.variantName === 'baseline')
    const optimized = variants.find((v: { variantName: string }) => v.variantName !== 'baseline')
    
    if (!baseline || !optimized) return { concluded: false, significance: 0 }

    const baselineRate = baseline.citationRate ?? 0
    const optimizedRate = optimized.citationRate ?? 0
    const baselinePosition = baseline.currentPosition ?? 99
    const optimizedPosition = optimized.currentPosition ?? 99

    // Calculate statistical significance using proportional Z-test
    // Simplified: if we have enough measurements (citation rate difference > 10% and position improvement)
    const rateImprovement = optimizedRate - baselineRate
    const positionImprovement = baselinePosition - optimizedPosition
    const hasEnoughData = Math.abs(rateImprovement) > 0.05 || positionImprovement > 0

    if (!hasEnoughData) {
      return { concluded: false, significance: 0 }
    }

    // Simple significance calculation based on effect size
    const significance = Math.min(
      Math.abs(rateImprovement * 100) + Math.max(0, positionImprovement * 5),
      99
    )

    const isConclusive = significance >= 50 // 50% confidence threshold

    if (isConclusive) {
      const winner = optimizedRate > baselineRate ? optimized : baseline
      const conclusion = winner.id === optimized.id
        ? `Optimized variant outperformed baseline (rate: ${(optimizedRate * 100).toFixed(1)}% vs ${(baselineRate * 100).toFixed(1)}%, confidence: ${significance.toFixed(1)}%)`
        : `Baseline performed similarly or better than optimized variant`

      await prisma.gEOABTest.update({
        where: { id: testId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          winnerVariantId: winner.id,
          conclusion
        }
      })

      // Update variant significance
      for (const v of variants) {
        await prisma.gEOABTestVariant.update({
          where: { id: v.id },
          data: { statisticalSignificance: significance }
        })
      }

      return { concluded: true, winnerId: winner.id, significance }
    }

    // Update significance scores
    for (const v of variants) {
      await prisma.gEOABTestVariant.update({
        where: { id: v.id },
        data: { statisticalSignificance: significance }
      })
    }

    return { concluded: false, significance }
  }

  /**
   * Get A/B test results summary for a project
   */
  static async getTestResults(projectId: string): Promise<any[]> {
    const tests = await prisma.gEOABTest.findMany({
      where: { projectId },
      include: { variants: true },
      orderBy: { startedAt: 'desc' },
      take: 20
    })

    return tests.map((test: any) => {
      const baseline = test.variants.find((v: { variantName: string }) => v.variantName === 'baseline')
      const optimized = test.variants.find((v: { variantName: string }) => v.variantName !== 'baseline')

      return {
        id: test.id,
        query: test.query,
        status: test.status,
        startedAt: test.startedAt,
        completedAt: test.completedAt,
        conclusion: test.conclusion,
        baselineRate: baseline?.citationRate ?? 0,
        optimizedRate: optimized?.citationRate ?? 0,
        baselinePosition: baseline?.currentPosition ?? null,
        optimizedPosition: optimized?.currentPosition ?? null,
        improvement: optimized && baseline
          ? ((optimized.citationRate ?? 0) - (baseline.citationRate ?? 0)) * 100
          : 0,
        significance: optimized?.statisticalSignificance ?? 0
      }
    })
  }

  /**
   * Get A/B test history for a specific content piece
   */
  static async getContentTestHistory(contentId: string): Promise<any[]> {
    const tests = await prisma.gEOABTest.findMany({
      where: { contentId },
      include: { variants: true },
      orderBy: { startedAt: 'desc' },
      take: 10
    })

    return tests.map((t: any) => ({
      id: t.id,
      query: t.query,
      status: t.status,
      variants: t.variants.map((v: any) => ({
        name: v.variantName,
        citationRate: v.citationRate,
        positionChange: v.baselinePosition && v.currentPosition
          ? v.baselinePosition - v.currentPosition
          : null,
        significance: v.statisticalSignificance
      }))
    }))
  }
}