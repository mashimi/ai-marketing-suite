import { prisma } from '../lib/db'
import { DeepSeekService } from './deepseek'
import { logger } from '../lib/logger'
import { redis } from '../lib/redis'
import { GEOCitationIndex } from './geo/citation-index'
import { GEOEntityAnalyzer, ImplicitQuestion } from './geo/entity-analyzer'
import { GEOABTest } from './geo/ab-test'
import { GEOReviewQueue } from './geo/review-queue'

interface BrandVoiceProfile {
  tone: string
  terminology: string[]
  forbiddenTerms: string[]
  brandMentionCount: number
  styleGuidelines: string[]
}

export class GEOMonitor {
  /**
   * Check real citations for a query across AI platforms
   * Uses actual grounding data instead of simulation
   */
  static async checkRanking(projectId: string, query: string, platforms: string[]) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) throw new Error('Project not found')

    const results = []
    for (const platform of platforms) {
      try {
        // Step 1: Get actual citation data from real scraping
        const citations = await GEOCitationIndex.scrapeCitations(projectId, query, platform)
        
        // Step 2: Record citation data to build citation index
        await GEOCitationIndex.recordCitations(projectId, platform, query, citations)

        // Step 3: Extract entities from cited competitor content for gap analysis
        for (const citation of citations) {
          if (citation.citedDomain !== new URL(project.url).hostname) {
            // Record competitor citations for competitive intelligence
            await GEOCitationIndex.recordCompetitorCitations(
              projectId,
              citation.citedDomain,
              platform,
              query,
              [citation]
            )

            // Extract entities from competitor content
            if (citation.snippet) {
              const entities = await GEOEntityAnalyzer.extractEntities(citation.snippet)
              await GEOEntityAnalyzer.recordEntityCoverage(projectId, entities, citation.citedDomain)
            }
          }
        }

        // Step 4: Calculate outcome-based scores
        const projectDomain = new URL(project.url).hostname
        const ourCitations = citations.filter(c => c.citedDomain === projectDomain)
        const citationRate = citations.length > 0 ? ourCitations.length / citations.length : 0
        
        // Position: best position of our content, or 99 if not found
        const position = ourCitations.length > 0
          ? Math.min(...ourCitations.map(c => c.position))
          : 99

        // Optimization score based on actual citation rate (outcome-based, not simulated)
        const optimizationScore = Math.round(citationRate * 100)

        // Step 5: Generate recommendations based on real data
        const recommendations = await this.getOptimizationRecommendations(projectId, query, platform)

        const ranking = {
          platform,
          query,
          position,
          url: ourCitations[0]?.citedUrl || project.url,
          title: ourCitations[0]?.citedUrl || project.name,
          snippet: ourCitations[0]?.snippet || '',
          optimizationScore,
          citationCount: ourCitations.length,
          totalCitations: citations.length,
          citationRate,
          recommendations: Array.isArray(recommendations?.actions) ? recommendations.actions : [],
        }

        await prisma.gEORanking.create({
          data: {
            projectId,
            platform: ranking.platform,
            query: ranking.query,
            position: ranking.position,
            url: ranking.url,
            title: ranking.title,
            snippet: ranking.snippet,
            optimizationScore: ranking.optimizationScore,
            recommendations: Array.isArray(ranking.recommendations) ? ranking.recommendations : [],
            timestamp: new Date(),
          },
        })

        results.push(ranking)
        logger.info(`GEO ranking for ${platform}: position ${ranking.position}, citation rate: ${(citationRate * 100).toFixed(1)}%, score: ${ranking.optimizationScore}`)
      } catch (err) {
        logger.error(`GEO ranking check failed for ${platform}`, { error: err })
        results.push({ platform, query, position: 99, optimizationScore: 0, citationRate: 0, recommendations: [] })
      }
    }

    return results
  }

  /**
   * Get AI-generated optimization recommendations with entity coverage analysis
   */
  static async getOptimizationRecommendations(projectId: string, query: string, platform?: string) {
    const cacheKey = `geo:optimize:${projectId}:${query}:${platform || 'all'}`

    try {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    } catch {
      // redis cache miss
    }

    const [content, project] = await Promise.all([
      prisma.contentPiece.findMany({
        where: { projectId, status: 'published' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.project.findUnique({ where: { id: projectId } }),
    ])

    if (!project) throw new Error('Project not found')

    try {
      // Get entity coverage analysis for richer recommendations
      const entityAnalysis = await GEOEntityAnalyzer.analyzeEntityCoverage(projectId)
      
      // Get citation rate for outcome-based context
      const citationStats = await GEOCitationIndex.getCitationRate(projectId, query)

      const prompt = `Target platform: ${platform || 'All AI search engines'}
Query: "${query}"
Project URL: ${project.url}

Current citation stats:
- Total citations tracked: ${citationStats.totalCitations}
- Our citations: ${citationStats.ourCitations}
- Current citation rate: ${(citationStats.rate * 100).toFixed(1)}%

Entity coverage gaps found: ${entityAnalysis.gaps.length > 0 ? entityAnalysis.gaps.map(g => `"${g.entity}" (${g.impact} impact)`).join(', ') : 'None identified'}
Implicit questions to answer: ${entityAnalysis.implicitQuestions.slice(0, 5).map(q => q.question).join(', ') || 'None identified'}

Content samples: ${JSON.stringify(content.slice(0, 3).map(c => ({ title: c.title, body: c.content.slice(0, 500) })))}

Provide JSON recommendations:
{
  "score": number (0-100, based on citation rate and entity coverage),
  "actions": [
    "specific actionable recommendation 1",
    "specific actionable recommendation 2"
  ],
  "schemaSuggestions": ["FAQ", "Article", "HowTo", "Product"],
  "faqSuggestions": ["question 1", "question 2"],
  "entityGaps": ["entity 1 you should mention", "entity 2 you should mention"],
  "implicitQuestions": ["question 1 to answer", "question 2 to answer"]
}`

      const result = await DeepSeekService.callWithRetry({
        systemPrompt: `You are a GEO (Generative Engine Optimization) expert using real citation data. Analyze content and provide structured recommendations based on actual citation gaps and entity coverage. Focus on actionable improvements that increase citation rates in AI search responses.`,
        userPrompt: prompt,
        responseFormat: { type: 'json_object' },
        temperature: 0.2,
        maxTokens: 2000,
      })

      const parsed = JSON.parse(result)
      const recommendations = {
        score: typeof parsed.score === 'number' ? parsed.score : Math.round(citationStats.rate * 80 + 20),
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        schemaSuggestions: Array.isArray(parsed.schemaSuggestions) ? parsed.schemaSuggestions : [],
        faqSuggestions: Array.isArray(parsed.faqSuggestions) ? parsed.faqSuggestions : [],
        entityGaps: Array.isArray(parsed.entityGaps) ? parsed.entityGaps : entityAnalysis.gaps.map(g => g.entity),
        implicitQuestions: Array.isArray(parsed.implicitQuestions) ? parsed.implicitQuestions : entityAnalysis.implicitQuestions.map(q => q.question),
      }

      try {
        await redis.setex(cacheKey, 43200, JSON.stringify(recommendations)) // 12 hour cache
      } catch {
        // ignore redis write errors
      }

      return recommendations
    } catch (err) {
      logger.error('GEO recommendations failed', { error: err })
      return {
        score: 50,
        actions: [
          'Improve entity coverage for key topics in your content',
          'Add FAQ section addressing implicit follow-up questions',
          'Include structured data markup (FAQ, HowTo, Article schema)',
          'Use conversational headings that match natural language queries'
        ],
        schemaSuggestions: ['FAQ', 'Article'],
        faqSuggestions: [],
        entityGaps: [],
        implicitQuestions: []
      }
    }
  }

  /**
   * Get brand voice profile from existing content
   */
  private static async getBrandVoiceProfile(projectId: string): Promise<BrandVoiceProfile> {
    const contentPieces = await prisma.contentPiece.findMany({
      where: { projectId, status: 'published' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { content: true, title: true }
    })

    const allContent = contentPieces.map(c => c.content).join('\n')

    try {
      const result = await DeepSeekService.callWithRetry({
        systemPrompt: `You are a brand voice analyst. Extract the brand voice profile from content samples. Return as JSON.`,
        userPrompt: `Analyze these content samples and extract:
1. Tone (formal, casual, technical, friendly, authoritative)
2. Key terminology used (list 5-10 recurring terms)
3. Terms to avoid / that don't fit the brand (list any you notice)
4. Style guidelines (bullet format, heading patterns, sentence length)

Content samples:
${allContent.slice(0, 3000)}

Return as JSON:
{
  "tone": string,
  "terminology": string[],
  "forbiddenTerms": string[],
  "styleGuidelines": string[]
}`,
        responseFormat: { type: 'json_object' },
        temperature: 0.2,
        maxTokens: 1000,
      })

      return {
        ...JSON.parse(result),
        brandMentionCount: contentPieces.length
      }
    } catch {
      // Default brand voice if analysis fails
      return {
        tone: 'professional',
        terminology: [],
        forbiddenTerms: [],
        brandMentionCount: contentPieces.length,
        styleGuidelines: ['Maintain consistent tone', 'Use active voice', 'Keep sentences concise']
      }
    }
  }

  /**
   * Apply optimization to a content piece with A/B testing and brand voice guardrails
   */
  static async applyOptimization(projectId: string, contentId: string, query: string) {
    const content = await prisma.contentPiece.findUnique({ where: { id: contentId } })
    if (!content) throw new Error('Content not found')

    const recommendations = await this.getOptimizationRecommendations(projectId, query)
    const actions = Array.isArray(recommendations?.actions) ? recommendations.actions : []

    if (!actions.length) {
      return { success: false, message: 'No actionable recommendations' }
    }

    // Get brand voice profile for guardrails
    const brandVoice = await this.getBrandVoiceProfile(projectId)

    // Generate optimized content with brand voice constraints
    const optimized = await DeepSeekService.callWithRetry({
      systemPrompt: `You are an expert AI content writer specializing in Generative Engine Optimization. Rewrite content based on GEO recommendations while STRICTLY maintaining brand voice.

Brand Voice Profile:
- Tone: ${brandVoice.tone}
- Key terminology to maintain: ${brandVoice.terminology.join(', ')}
- Terms to AVOID: ${brandVoice.forbiddenTerms.join(', ')}
- Style guidelines: ${brandVoice.styleGuidelines.join('; ')}

CRITICAL RULES:
1. DO NOT change factual claims or statistics
2. Maintain the original brand voice and terminology
3. Do NOT add generic phrases that don't fit the brand
4. Preserve any CTAs and conversion elements
5. Keep the same general structure unless recommending changes
6. Add FAQ sections naturally where they fit
7. Use conversational headings matching the query intent`,
      userPrompt: `Query to optimize for: "${query}"
Recommendations to apply: ${JSON.stringify(actions)}
Entity gaps to fill: ${JSON.stringify(recommendations.entityGaps || [])}
Implicit questions to answer: ${JSON.stringify(recommendations.implicitQuestions || [])}

Original content:
${content.content}

Return JSON:
{
  "content": "Full markdown rewritten content here, preserving brand voice",
  "scoreChange": number (estimated improvement 1-50),
  "changesApplied": ["list", "of", "specific", "changes", "made"]
}`,
      responseFormat: { type: 'json_object' },
      temperature: 0.3,
      maxTokens: 4000,
    })

    const rewriteResult = JSON.parse(optimized)
    const optimizedContent = rewriteResult.content || content.content
    const scoreChange = typeof rewriteResult.scoreChange === 'number' ? rewriteResult.scoreChange : 15
    const changesApplied = Array.isArray(rewriteResult.changesApplied) ? rewriteResult.changesApplied : []

    // Add to review queue with severity classification
    const reviewResult = await GEOReviewQueue.addToQueue({
      projectId,
      contentId,
      query,
      originalContent: content.content,
      optimizedContent,
      changesSummary: { actions, changesApplied, scoreChange }
    })

    // If auto-applied, record the optimization
    if (reviewResult.autoApplied) {
      await prisma.gEOOptimization.create({
        data: {
          projectId,
          query,
          targetUrl: content.id,
          beforeScore: recommendations.score,
          improvements: JSON.parse(JSON.stringify({
            actions,
            preview: optimizedContent.slice(0, 500),
            changesApplied,
            brandVoiceProfile: brandVoice
          })),
          status: 'applied',
          appliedAt: new Date(),
          brandVoiceProfile: JSON.parse(JSON.stringify(brandVoice)),
          variantId: null,
        },
      })

      logger.info(`GEO optimization auto-applied to content ${contentId} for query "${query}"`)
    } else {
      // If medium/high severity, also start an A/B test for measurement
      try {
        await GEOABTest.createTest({
          projectId,
          contentId,
          query,
          originalContent: content.content,
          optimizedContent,
          changesApplied: { actions, changesApplied, scoreChange },
          variantName: `geo-opt-${Date.now()}`
        })
      } catch (err) {
        logger.error('Failed to create A/B test for optimization', { error: err })
      }

      logger.info(`GEO optimization queued for review [${reviewResult.id}] on content ${contentId} for query "${query}"`)
    }

    return {
      success: reviewResult.autoApplied,
      contentId: content.id,
      scoreChange,
      reviewId: reviewResult.id,
      severity: reviewResult.severity,
      requiresApproval: !reviewResult.autoApplied,
      message: reviewResult.autoApplied
        ? 'Optimization auto-applied'
        : `Optimization queued for review (${reviewResult.severity} severity)`
    }
  }

  /**
   * Get GEO health dashboard - outcome-based metrics
   */
  static async getGEOHealthDashboard(projectId: string) {
    const rankings = await prisma.gEORanking.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      distinct: ['platform', 'query'],
      take: 100,
    })

    // Get citation stats
    const citationStats = await GEOCitationIndex.getCitationRate(projectId)

    // Get entity coverage analysis
    const entityAnalysis = await GEOEntityAnalyzer.analyzeEntityCoverage(projectId)

    // Get review queue stats
    const reviewStats = await GEOReviewQueue.getQueueStats(projectId)

    if (rankings.length === 0) {
      return {
        overall: {
          avgPosition: '0',
          avgOptimizationScore: '0',
          totalTrackedQueries: 0,
          citationRate: (citationStats.rate * 100).toFixed(1),
          totalCitations: citationStats.totalCitations,
          ourCitations: citationStats.ourCitations,
        },
        byPlatform: {},
        opportunities: [],
        recentRankings: [],
        entityGaps: entityAnalysis.gaps.slice(0, 5),
        reviewQueue: reviewStats,
        citatonIndex: [],
      }
    }

    // Use safe division to prevent NaN
    const avgPosition = rankings.length > 0
      ? rankings.reduce((sum, r) => sum + r.position, 0) / rankings.length
      : 0
    
    const totalOptimizationScore = rankings.reduce((sum, r) => sum + (r.optimizationScore ?? 0), 0)
    const avgOptimizationScore = rankings.length > 0
      ? totalOptimizationScore / rankings.length
      : 0

    // Group by platform
    const byPlatform: Record<string, { avgPosition: number; count: number; citationCount?: number }> = {}
    for (const r of rankings) {
      if (!byPlatform[r.platform]) byPlatform[r.platform] = { avgPosition: 0, count: 0 }
      byPlatform[r.platform].avgPosition += r.position
      byPlatform[r.platform].count++
    }
    for (const p in byPlatform) {
      byPlatform[p].avgPosition = byPlatform[p].count > 0
        ? byPlatform[p].avgPosition / byPlatform[p].count
        : 0
    }

    // Find quick-win opportunities based on citation gaps and position
    const opportunities = rankings
      .filter(r => r.position > 10 && (r.optimizationScore ?? 0) < 60)
      .map(r => ({
        query: r.query,
        platform: r.platform,
        position: r.position,
        score: r.optimizationScore ?? 0,
        type: 'position',
      }))

    // Add entity gap opportunities
    const entityOpportunities = entityAnalysis.gaps
      .filter(g => g.impact === 'high' || g.impact === 'medium')
      .map(g => ({
        query: g.entity,
        platform: 'all',
        position: 99,
        score: Math.round(g.ourCoverage * 100),
        type: 'entity_gap',
        impact: g.impact,
      }))
      .slice(0, 5)

    const allOpportunities = [...opportunities, ...entityOpportunities]
      .sort((a, b) => {
        // Prioritize entity gaps, then position improvements
        if (a.type === 'entity_gap' && b.type !== 'entity_gap') return -1
        if (b.type === 'entity_gap' && a.type !== 'entity_gap') return 1
        return a.score - b.score
      })
      .slice(0, 10)

    return {
      overall: {
        avgPosition: avgPosition.toFixed(1),
        avgOptimizationScore: avgOptimizationScore.toFixed(0),
        totalTrackedQueries: rankings.length,
        citationRate: (citationStats.rate * 100).toFixed(1),
        totalCitations: citationStats.totalCitations,
        ourCitations: citationStats.ourCitations,
      },
      byPlatform,
      opportunities: allOpportunities,
      recentRankings: rankings.slice(0, 10),
      entityGaps: entityAnalysis.gaps.slice(0, 5),
      implicitQuestions: entityAnalysis.implicitQuestions.slice(0, 5),
      reviewQueue: reviewStats,
      citatonIndex: await GEOCitationIndex.buildCitationIndex(projectId),
    }
  }

  /**
   * Auto-optimize underperforming content with severity classification
   */
  static async autoOptimizeAll(projectId: string, limit = 5) {
    const dashboard = await this.getGEOHealthDashboard(projectId)
    const topOpportunities = dashboard.opportunities.slice(0, limit)
    const results = []

    for (const opp of topOpportunities) {
      if (opp.type === 'entity_gap') {
        // Entity gaps can't be auto-optimized (need content creation, not rewriting)
        results.push({
          query: opp.query,
          success: false,
          reason: 'Entity gap - requires new content creation',
          type: 'entity_gap'
        })
        continue
      }

      const content = await prisma.contentPiece.findFirst({
        where: {
          projectId,
          keywords: { hasSome: [opp.query.split(' ')[0]] },
          status: 'published',
        },
      })

      if (content) {
        const result = await this.applyOptimization(projectId, content.id, opp.query)
        results.push({
          query: opp.query,
          contentId: content.id,
          success: result.success,
          requiresApproval: result.requiresApproval,
          severity: result.severity,
          reviewId: result.reviewId,
        })
      } else {
        results.push({ query: opp.query, success: false, reason: 'No relevant content found' })
      }
    }

    return results
  }

  // --- New query clustering ---

  /**
   * Cluster semantically similar queries together
   */
  static async clusterQueries(projectId: string): Promise<void> {
    const queries = await prisma.gEORanking.findMany({
      where: { projectId },
      distinct: ['query'],
      select: { query: true },
    })

    const queryTexts = queries.map(q => q.query)
    
    try {
      const result = await DeepSeekService.callWithRetry({
        systemPrompt: `You are a semantic clustering expert. Group similar search queries into topic clusters.`,
        userPrompt: `Group these queries into semantic clusters (3-7 queries per cluster). For each cluster, provide a name and the queries:\n${JSON.stringify(queryTexts)}\n\nReturn JSON: [{ "clusterName": string, "queries": string[] }]`,
        responseFormat: { type: 'json_object' },
        temperature: 0.1,
      })

      const clusters = JSON.parse(result).clusters || JSON.parse(result)
      const clusterArray = Array.isArray(clusters) ? clusters : []
      
      // Remove existing clusters
      await prisma.gEOQueryCluster.deleteMany({ where: { projectId } })
      
      // Insert new clusters
      for (const cluster of clusterArray) {
        if (cluster.clusterName && Array.isArray(cluster.queries)) {
          await prisma.gEOQueryCluster.create({
            data: {
              projectId,
              clusterName: cluster.clusterName,
              queries: cluster.queries,
              topicCategory: 'auto-detected',
            }
          })
        }
      }
    } catch (err) {
      logger.error('Query clustering failed', { error: err })
    }
  }
}