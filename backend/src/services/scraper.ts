import axios from 'axios'
import * as cheerio from 'cheerio'
import { logger } from '../lib/logger'

export interface PageAnalysis {
  url: string
  title: string
  metaDescription: string
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  images: {
    total: number
    withoutAlt: number
    urls: string[]
  }
  links: {
    internal: number
    external: number
    broken: number
  }
  wordCount: number
  loadTime: number
  hasSchema: boolean
  hasSitemap: boolean
  hasRobots: boolean
  canonicalUrl: string | null
  openGraph: Record<string, string>
  twitterCard: Record<string, string>
  structuredData: any[]
  performance: {
    lcp: number | null
    fid: number | null
    cls: number | null
  }
}

export class ScrapingService {
  static async analyzePage(url: string): Promise<PageAnalysis> {
    const startTime = Date.now()

    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI-Marketing-Bot/1.0)',
        },
        maxRedirects: 5,
      })

      const html = response.data
      const $ = cheerio.load(html)
      const loadTime = Date.now() - startTime

      const title = $('title').text().trim()
      const metaDescription = $('meta[name="description"]').attr('content') || ''
      const canonicalUrl = $('link[rel="canonical"]').attr('href') || null

      const headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get(),
      }

      const images = $('img')
      const imageUrls = images.map((_, el) => $(el).attr('src')).get().filter(Boolean)
      const imagesWithoutAlt = images.filter((_, el) => !$(el).attr('alt')).length

      const allLinks = $('a[href]')
      const internalLinks = allLinks.filter((_, el) => {
        const href = $(el).attr('href') || ''
        return href.startsWith('/') || href.includes(new URL(url).hostname)
      }).length
      const externalLinks = allLinks.length - internalLinks

      const wordCount = $('body').text().trim().split(/\s+/).length

      const hasSchema = $('script[type="application/ld+json"]').length > 0
      const structuredData = $('script[type="application/ld+json"]')
        .map((_, el) => {
          try {
            return JSON.parse($(el).html() || '{}')
          } catch {
            return null
          }
        })
        .get()
        .filter(Boolean)

      const openGraph: Record<string, string> = {}
      $('meta[property^="og:"]').each((_, el) => {
        const property = $(el).attr('property')
        const content = $(el).attr('content')
        if (property && content) {
          openGraph[property] = content
        }
      })

      const twitterCard: Record<string, string> = {}
      $('meta[name^="twitter:"]').each((_, el) => {
        const name = $(el).attr('name')
        const content = $(el).attr('content')
        if (name && content) {
          twitterCard[name] = content
        }
      })

      // Check for sitemap and robots.txt
      const baseUrl = new URL(url).origin
      let hasSitemap = false
      let hasRobots = false

      try {
        await axios.get(`${baseUrl}/sitemap.xml`, { timeout: 5000 })
        hasSitemap = true
      } catch {
        hasSitemap = false
      }

      try {
        await axios.get(`${baseUrl}/robots.txt`, { timeout: 5000 })
        hasRobots = true
      } catch {
        hasRobots = false
      }

      logger.info('Page analyzed', { url, loadTime, wordCount })

      return {
        url,
        title,
        metaDescription,
        headings,
        images: {
          total: images.length,
          withoutAlt: imagesWithoutAlt,
          urls: imageUrls,
        },
        links: {
          internal: internalLinks,
          external: externalLinks,
          broken: 0, // Would need additional checks
        },
        wordCount,
        loadTime,
        hasSchema,
        hasSitemap,
        hasRobots,
        canonicalUrl,
        openGraph,
        twitterCard,
        structuredData,
        performance: {
          lcp: null,
          fid: null,
          cls: null,
        },
      }
    } catch (error) {
      logger.error('Page analysis failed', { error, url })
      throw error
    }
  }

  static async crawlSite(baseUrl: string, maxPages: number = 50): Promise<PageAnalysis[]> {
    const visited = new Set<string>()
    const toVisit = [baseUrl]
    const results: PageAnalysis[] = []

    while (toVisit.length > 0 && visited.size < maxPages) {
      const url = toVisit.shift()!
      if (visited.has(url)) continue

      try {
        const analysis = await this.analyzePage(url)
        results.push(analysis)
        visited.add(url)

        // Add internal links to queue
        const $ = cheerio.load(await axios.get(url).then(r => r.data))
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || ''
          if (href.startsWith('/') || href.includes(new URL(baseUrl).hostname)) {
            const fullUrl = href.startsWith('/') ? `${baseUrl}${href}` : href
            if (!visited.has(fullUrl) && toVisit.length < maxPages) {
              toVisit.push(fullUrl)
            }
          }
        })
      } catch {
        visited.add(url)
      }
    }

    return results
  }
}
