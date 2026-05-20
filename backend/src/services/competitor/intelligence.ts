import axios from 'axios'
import * as cheerio from 'cheerio'
import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'
import { aiRouter } from '../ai-router'

export class CompetitorIntelligence {
  // ─── Scrape & Analyze Competitor ───
  async analyze(projectId: string, domain: string, ourDomain?: string): Promise<any> {
    logger.info('Analyzing competitor', { domain, projectId })

    // Parallel data collection
    const [pageData, aiAnalysis] = await Promise.all([
      this.scrapeCompetitor(domain),
      this.aiAnalyzeCompetitor(domain, ourDomain),
    ])

    // Store or update
    const competitor = await prisma.competitor.upsert({
      where: {
        projectId_domain: { projectId, domain },
      },
      update: {
        ...pageData,
        ...aiAnalysis,
        lastAnalyzedAt: new Date(),
      },
      create: {
        projectId,
        domain,
        ...pageData,
        ...aiAnalysis,
        lastAnalyzedAt: new Date(),
      },
    })

    // Create snapshot for history tracking
    await prisma.competitorSnapshot.create({
      data: {
        competitorId: competitor.id,
        domainAuthority: competitor.domainAuthority,
        backlinks: competitor.backlinks,
        organicKeywords: competitor.organicKeywords,
        organicTraffic: competitor.organicTraffic,
        contentPieces: competitor.contentPieces,
      }
    })

    // Generate gap analysis
    if (ourDomain) {
      await this.generateGaps(competitor.id, ourDomain, domain)
    }

    return competitor
  }

  // ─── Scrape Competitor Website ───
  private async scrapeCompetitor(domain: string): Promise<any> {
    const url = domain.startsWith('http') ? domain : `https://${domain}`

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      })

      const $ = cheerio.load(response.data)

      // Extract basic data
      const title = $('title').text()
      const description = $('meta[name="description"]').attr('content')

      // Count content pieces (blog posts, etc.)
      const blogLinks = $('a[href*="/blog/"], a[href*="/article/"], a[href*="/post/"]').length

      // Detect tech stack
      const techStack: string[] = []
      if ($('meta[name="generator"]').attr('content')?.includes('WordPress')) techStack.push('WordPress')
      const scriptContent = $('script').text()
      if (scriptContent.includes('next')) techStack.push('Next.js')
      if (scriptContent.includes('react')) techStack.push('React')
      if (scriptContent.includes('gatsby')) techStack.push('Gatsby')
      if ($('link[href*="shopify"]').length) techStack.push('Shopify')

      // Extract top topics from navigation
      const topics = $('nav a, .categories a, .tags a')
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t: string) => t.length > 2 && t.length < 30)
        .slice(0, 10)

      return {
        name: title?.split(/[-|]/)[0]?.trim() || domain,
        description,
        contentPieces: blogLinks,
        topTopics: [...new Set(topics)],
        techStack: [...new Set(techStack)],
      }
    } catch (error) {
      logger.error('Failed to scrape competitor', { error, domain })
      return {
        name: domain,
        contentPieces: 0,
        topTopics: [],
        techStack: [],
      }
    }
  }

  // ─── AI-Powered Deep Analysis ───
  private async aiAnalyzeCompetitor(domain: string, ourDomain?: string): Promise<any> {
    const prompt = `Analyze this competitor domain: ${domain}
${ourDomain ? `Our domain (for comparison): ${ourDomain}` : ''}

Provide structured analysis including:
1. Estimated domain authority (0-100)
2. Estimated backlink count
3. Organic keywords count estimate
4. Organic traffic estimate (monthly visits)
5. SEO strengths (3-5 points)
6. SEO weaknesses (3-5 points)
7. Opportunities for us
8. Threats they pose

Return JSON in this format:
{
  "domainAuthority": number,
  "estimatedBacklinks": number,
  "organicKeywords": number,
  "organicTraffic": number,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "opportunities": ["..."],
  "threats": ["..."]
}`

    try {
      const response = await aiRouter.generate({
        task: 'competitor_analysis',
        complexity: 'high',
        systemPrompt: 'You are an expert competitive intelligence analyst.',
        userPrompt: prompt,
        userId: 'system',
        userPlan: 'enterprise',
      }) as any

      const content = response.content || ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

      return {
        domainAuthority: Number(parsed.domainAuthority) || 0,
        backlinks: Number(parsed.estimatedBacklinks) || 0,
        organicKeywords: Number(parsed.organicKeywords) || 0,
        organicTraffic: Number(parsed.organicTraffic) || 0,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
        threats: Array.isArray(parsed.threats) ? parsed.threats : [],
      }
    } catch (error) {
      logger.error('AI competitor analysis failed', { error, domain, stack: error instanceof Error ? error.stack : undefined })
      return {
        domainAuthority: 0,
        backlinks: 0,
        organicKeywords: 0,
        organicTraffic: 0,
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      }
    }
  }

  // ─── Generate Gap Analysis ───
  private async generateGaps(competitorId: string, ourDomain: string, theirDomain: string): Promise<void> {
    const ourProject = await prisma.project.findFirst({
      where: { url: { contains: ourDomain } },
      include: {
        keywords: true,
        content: true,
        seoAudits: { orderBy: { timestamp: 'desc' }, take: 1 },
      }
    })

    const competitor = await prisma.competitor.findUnique({
      where: { id: competitorId },
    })

    if (!ourProject || !competitor) {
      logger.warn('Skipping gap analysis: project or competitor not found', { ourDomain, competitorId })
      return
    }

    const prompt = `Compare our domain ${ourDomain} with competitor ${theirDomain} and identify specific strategic gaps.

OUR DATA:
- Keywords tracked: ${ourProject.keywords.length}
- Content pieces: ${ourProject.content.length}
- Latest SEO score: ${ourProject.seoAudits[0]?.overallScore || 'N/A'}

COMPETITOR DATA:
- Domain Authority: ${competitor.domainAuthority}
- Organic Keywords: ${competitor.organicKeywords}
- Organic Traffic: ${competitor.organicTraffic}
- Strengths: ${competitor.strengths.join(', ')}

Identify 3-5 specific gaps where they outperform us. Return JSON array:
[{
  "type": "keyword" | "content" | "backlink" | "technical",
  "priority": "high" | "medium" | "low",
  "theirAdvantage": "specific description",
  "ourState": "how we compare",
  "action": "recommended fix",
  "estimatedImpact": "expected result",
  "difficulty": "easy" | "moderate" | "hard"
}]`

    try {
      const response = await aiRouter.generate({
        task: 'gap_analysis',
        complexity: 'high',
        systemPrompt: 'You are a strategic gap analysis expert.',
        userPrompt: prompt,
        userId: 'system',
        userPlan: 'enterprise',
      }) as any

      const content = response.content || ''
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      const rawGaps = jsonMatch ? JSON.parse(jsonMatch[0]) : []

      // Normalize gaps for Prisma enums
      const gaps = rawGaps.map((gap: any) => {
        const type = gap.type?.toLowerCase()
        const priority = gap.priority?.toLowerCase()
        
        return {
          competitorId,
          type: ['keyword', 'content', 'backlink', 'technical'].includes(type) ? type : 'keyword',
          priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
          theirAdvantage: String(gap.theirAdvantage || ''),
          ourState: String(gap.ourState || ''),
          action: String(gap.action || ''),
          estimatedImpact: String(gap.estimatedImpact || ''),
          difficulty: ['easy', 'moderate', 'hard'].includes(gap.difficulty?.toLowerCase()) ? gap.difficulty.toLowerCase() : 'moderate',
        }
      })

      // Clear old gaps first
      await prisma.competitorGap.deleteMany({
        where: { competitorId }
      })

      await prisma.competitorGap.createMany({
        data: gaps
      })

      logger.info('Generated gaps', { competitorId, count: gaps.length })
    } catch (error) {
      logger.error('Gap analysis failed', { error, competitorId, stack: error instanceof Error ? error.stack : undefined })
    }
  }

  // ─── Track Changes Over Time ───
  async getTrends(competitorId: string, days: number = 90) {
    const snapshots = await prisma.competitorSnapshot.findMany({
      where: {
        competitorId,
        capturedAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      orderBy: { capturedAt: 'asc' },
    })

    return snapshots.map(s => ({
      date: s.capturedAt.toISOString().split('T')[0],
      domainAuthority: s.domainAuthority,
      backlinks: s.backlinks,
      organicKeywords: s.organicKeywords,
      organicTraffic: s.organicTraffic,
      contentPieces: s.contentPieces,
    }))
  }

  // ─── Side-by-Side Comparison ───
  async compare(projectId: string, competitorIds: string[]) {
    const [ourProject, competitors] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        include: {
          keywords: true,
          content: true,
          analytics: { orderBy: { date: 'desc' }, take: 1 },
        }
      }),
      prisma.competitor.findMany({
        where: { id: { in: competitorIds } },
        include: { gaps: true }
      })
    ])

    if (!ourProject) throw new Error('Project not found')

    return {
      us: {
        domain: ourProject.url,
        keywords: ourProject.keywords.length,
        content: ourProject.content.length,
        traffic: ourProject.analytics[0]?.traffic || 0,
        authority: 45, // Default for baseline
      },
      competitors: competitors.map(c => ({
        id: c.id,
        domain: c.domain,
        name: c.name,
        authority: c.domainAuthority,
        backlinks: c.backlinks,
        keywords: c.organicKeywords,
        traffic: c.organicTraffic,
        content: c.contentPieces,
        strengths: c.strengths,
        weaknesses: c.weaknesses,
        gaps: c.gaps.length,
        lastAnalyzed: c.lastAnalyzedAt,
      }))
    }
  }
}

export const competitorIntelligence = new CompetitorIntelligence()
