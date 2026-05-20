import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'
import { redis } from '../../lib/redis'
import axios from 'axios'

interface CitationScrapeResult {
  citedUrl: string
  citedDomain: string
  snippet: string
  position: number
}

export class GEOCitationIndex {
  /**
   * Scrape what AI search engines actually cite for a given query
   * Uses Perplexity API or Google Programmable Search as grounding data
   */
  static async scrapeCitations(
    projectId: string,
    query: string,
    platform: string
  ): Promise<CitationScrapeResult[]> {
    const cacheKey = `geo:citations:${projectId}:${query}:${platform}`
    
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return JSON.parse(cached)
    } catch {
      // cache miss
    }

    const results: CitationScrapeResult[] = []
    
    try {
      // Try Perplexity API first (most accurate for AI search citations)
      const perplexityKey = process.env.PERPLEXITY_API_KEY
      if (perplexityKey) {
        const response = await axios.post(
          'https://api.perplexity.ai/chat/completions',
          {
            model: 'sonar-pro',
            messages: [
              { 
                role: 'system', 
                content: `You are a citation analysis tool. When asked a question, return the specific sources you would cite, with exact URLs and snippets. Format as JSON array.` 
              },
              { 
                role: 'user', 
                content: `For the query "${query}", list the top sources you would cite in your response. Include cited URL (cited_url), cited domain (cited_domain), a brief snippet, and position (1-based ranking). Return as JSON array.` 
              }
            ],
            temperature: 0.1,
          },
          {
            headers: {
              'Authorization': `Bearer ${perplexityKey}`,
              'Content-Type': 'application/json'
            }
          }
        )

        const content = response.data.choices?.[0]?.message?.content || '[]'
        let parsed: CitationScrapeResult[] = []
        try {
          parsed = JSON.parse(content)
        } catch {
          // Try to extract JSON from the response
          const match = content.match(/\[[\s\S]*\]/)
          if (match) parsed = JSON.parse(match[0])
        }
        results.push(...parsed)
      }

      // Fallback: Use Google Custom Search to see what's ranking
      if (results.length === 0) {
        const googleKey = process.env.GOOGLE_API_KEY
        const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID
        if (googleKey && searchEngineId) {
          const response = await axios.get(
            'https://www.googleapis.com/customsearch/v1',
            {
              params: {
                key: googleKey,
                cx: searchEngineId,
                q: query,
                num: 10
              }
            }
          )

          response.data.items?.forEach((item: any, index: number) => {
            try {
              const url = new URL(item.link)
              results.push({
                citedUrl: item.link,
                citedDomain: url.hostname,
                snippet: item.snippet || '',
                position: index + 1
              })
            } catch {
              // skip invalid URLs
            }
          })
        }
      }
    } catch (err) {
      logger.error(`Citation scrape failed for ${platform}`, { error: err, query })
    }

    // Cache results for 6 hours
    try {
      if (results.length > 0) {
        await redis.setex(cacheKey, 21600, JSON.stringify(results))
      }
    } catch {
      // ignore cache errors
    }

    return results
  }

  /**
   * Record citation data from scrape results
   */
  static async recordCitations(
    projectId: string,
    platform: string,
    query: string,
    citations: CitationScrapeResult[]
  ): Promise<void> {
    for (const citation of citations) {
      // Upsert citation source
      const existing = await prisma.gEOCitationSource.findFirst({
        where: {
          projectId,
          platform,
          query,
          citedUrl: citation.citedUrl
        }
      })

      if (existing) {
        await prisma.gEOCitationSource.update({
          where: { id: existing.id },
          data: {
            citationCount: { increment: 1 },
            lastSeenAt: new Date(),
            position: citation.position,
            snippet: citation.snippet || existing.snippet
          }
        })
      } else {
        await prisma.gEOCitationSource.create({
          data: {
            projectId,
            platform,
            query,
            citedUrl: citation.citedUrl,
            citedDomain: citation.citedDomain,
            snippet: citation.snippet || '',
            position: citation.position,
            citationCount: 1
          }
        })
      }
    }
  }

  /**
   * Get our citation rate for a project across queries
   */
  static async getCitationRate(
    projectId: string,
    query?: string
  ): Promise<{ totalCitations: number; ourCitations: number; rate: number }> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { url: true }
    })
    if (!project) throw new Error('Project not found')

    const projectDomain = new URL(project.url).hostname

    const where: any = { projectId }
    if (query) where.query = query

    const allCitations = await prisma.gEOCitationSource.findMany({ where })
    const totalCitations = allCitations.length
    const ourCitations = allCitations.filter(c => c.citedDomain === projectDomain).length

    return {
      totalCitations,
      ourCitations,
      rate: totalCitations > 0 ? ourCitations / totalCitations : 0
    }
  }

  /**
   * Build a citation index: which domains are most frequently cited per query category
   */
  static async buildCitationIndex(
    projectId: string
  ): Promise<{ domain: string; totalCitations: number; queries: string[] }[]> {
    const citations = await prisma.gEOCitationSource.findMany({
      where: { projectId },
      orderBy: { citationCount: 'desc' }
    })

    const domainMap = new Map<string, { count: number; queries: Set<string> }>()
    for (const c of citations) {
      if (!domainMap.has(c.citedDomain)) {
        domainMap.set(c.citedDomain, { count: 0, queries: new Set() })
      }
      const entry = domainMap.get(c.citedDomain)!
      entry.count += c.citationCount
      entry.queries.add(c.query)
    }

    return Array.from(domainMap.entries())
      .map(([domain, data]) => ({
        domain,
        totalCitations: data.count,
        queries: Array.from(data.queries)
      }))
      .sort((a: { totalCitations: number }, b: { totalCitations: number }) => b.totalCitations - a.totalCitations)
  }

  /**
   * Get competitor citation data for competitive intelligence
   */
  static async getCompetitorCitations(
    projectId: string,
    competitorDomain: string
  ): Promise<{ query: string; platform: string; citedUrl: string; position: number }[]> {
    const citations = await prisma.gEOCompetitorCitation.findMany({
      where: { projectId, competitorDomain },
      orderBy: { lastSeenAt: 'desc' },
      take: 50
    })
    return citations.map((c: any) => ({
      query: c.query,
      platform: c.platform,
      citedUrl: c.citedUrl,
      position: c.position
    }))
  }

  /**
   * Track competitor citations alongside our own
   */
  static async recordCompetitorCitations(
    projectId: string,
    competitorDomain: string,
    platform: string,
    query: string,
    citations: CitationScrapeResult[]
  ): Promise<void> {
    for (const citation of citations.filter(c => c.citedDomain === competitorDomain)) {
      const existing = await prisma.gEOCompetitorCitation.findFirst({
        where: {
          projectId,
          competitorDomain,
          platform,
          query,
          citedUrl: citation.citedUrl
        }
      })

      if (existing) {
        await prisma.gEOCompetitorCitation.update({
          where: { id: existing.id },
          data: {
            citationCount: { increment: 1 },
            lastSeenAt: new Date(),
            position: citation.position
          }
        })
      } else {
        await prisma.gEOCompetitorCitation.create({
          data: {
            projectId,
            competitorDomain,
            platform,
            query,
            citedUrl: citation.citedUrl,
            snippet: citation.snippet,
            position: citation.position
          }
        })
      }
    }
  }
}