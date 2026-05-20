/// <reference lib="dom" />
import { chromium, Browser, BrowserContext } from 'playwright'
import { logger } from '../lib/logger'

// Re-export the old interface so existing imports don't break
export interface PageAnalysis {
  url: string
  title: string
  metaDescription: string
  headings: { h1: string[]; h2: string[]; h3: string[] }
  images: { total: number; withoutAlt: number; urls: string[] }
  links: { internal: number; external: number; broken: number }
  wordCount: number
  loadTime: number
  hasSchema: boolean
  hasSitemap: boolean
  hasRobots: boolean
  canonicalUrl: string | null
  openGraph: Record<string, string>
  twitterCard: Record<string, string>
  structuredData: any[]
  performance: { lcp: number | null; fid: number | null; cls: number | null }
}

// ─── Extended deep crawl result ───────────────────────────────────────────────
export interface DeepCrawlResult extends PageAnalysis {
  rawText: string
  scripts: number
  stylesheets: number
  isJavaScriptRendered: boolean
  paintMetrics: { name: string; startTime: number }[]
}

// ─── Browser pool (single instance reused across jobs to save memory) ────────
class BrowserPool {
  private browser: Browser | null = null
  private launchCount = 0
  private readonly maxReuseCount = 20 // Relaunch every 20 uses to prevent memory leaks

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected() || this.launchCount >= this.maxReuseCount) {
      if (this.browser) {
        try { await this.browser.close() } catch { /* ignore */ }
      }
      logger.info('Launching Playwright Chromium browser...')
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',    // Important for Linux/Docker
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',           // Reduces memory on VPS
        ],
      })
      this.launchCount = 0
    }
    this.launchCount++
    return this.browser
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

const pool = new BrowserPool()

// ─── ScrapingService ──────────────────────────────────────────────────────────
export class ScrapingService {

  /**
   * Full Playwright deep crawl — works on React, Next.js, Vue SPAs.
   * Waits for network idle so all dynamic content is rendered.
   */
  static async deepCrawl(url: string, timeoutMs = 30_000): Promise<DeepCrawlResult> {
    const startTime = Date.now()
    const browser = await pool.getBrowser()
    let context: BrowserContext | null = null

    try {
      context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        // Block images/fonts to speed up crawl
        extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' },
      })

      // Block unnecessary resources to speed up scraping
      await context.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf}', route => route.abort())

      const page = await context.newPage()

      // Navigate and wait for network to be idle (critical for JS-rendered pages)
      await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs })

      // Extract all data from the fully-rendered DOM
      const domData = await page.evaluate(() => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || ''
        const getMetaProperty = (prop: string) =>
          document.querySelector(`meta[property="${prop}"]`)?.getAttribute('content') || ''

        const openGraph: Record<string, string> = {}
        document.querySelectorAll('meta[property^="og:"]').forEach((el: any) => {
          const prop = el.getAttribute('property')
          const content = el.getAttribute('content')
          if (prop && content) openGraph[prop] = content
        })

        const twitterCard: Record<string, string> = {}
        document.querySelectorAll('meta[name^="twitter:"]').forEach((el: any) => {
          const name = el.getAttribute('name')
          const content = el.getAttribute('content')
          if (name && content) twitterCard[name] = content
        })

        const structuredData: any[] = []
        document.querySelectorAll('script[type="application/ld+json"]').forEach((el: any) => {
          try { structuredData.push(JSON.parse(el.textContent || '{}')) } catch { /* skip */ }
        })

        const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
        const links = Array.from(document.querySelectorAll('a[href]')) as HTMLAnchorElement[]
        const origin = window.location.origin

        const internalLinks = links.filter((a: any) => {
          const href = a.getAttribute('href') || ''
          return href.startsWith('/') || href.startsWith(origin)
        }).length

        const paintMetrics = (performance.getEntriesByType('paint') as any[]).map((e: any) => ({
          name: e.name,
          startTime: Math.round(e.startTime),
        }))

        return {
          title: document.title,
          metaDescription: getMeta('description'),
          canonicalUrl: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
          h1s: Array.from(document.querySelectorAll('h1')).map((h: any) => h.textContent?.trim() || ''),
          h2s: Array.from(document.querySelectorAll('h2')).map((h: any) => h.textContent?.trim() || ''),
          h3s: Array.from(document.querySelectorAll('h3')).map((h: any) => h.textContent?.trim() || ''),
          imageTotal: images.length,
          imagesWithoutAlt: images.filter((img: any) => !img.alt).length,
          imageUrls: images.map((img: any) => img.src).filter(Boolean).slice(0, 50),
          totalLinks: links.length,
          internalLinks,
          externalLinks: links.length - internalLinks,
          wordCount: (document.body?.innerText || '').split(/\s+/).filter(Boolean).length,
          hasSchema: document.querySelectorAll('script[type="application/ld+json"]').length > 0,
          scripts: document.querySelectorAll('script').length,
          stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
          openGraph,
          twitterCard,
          structuredData,
          rawText: (document.body?.innerText || '').slice(0, 5000),
          paintMetrics,
          isJavaScriptRendered: document.querySelectorAll('[data-reactroot],[data-v-],[ng-version]').length > 0,
        }
      })

      const loadTime = Date.now() - startTime
      logger.info('Playwright deep crawl complete', { url, loadTime, title: domData.title })

      // Check sitemap + robots in parallel (fast axios calls)
      const baseUrl = new URL(url).origin
      const [hasSitemap, hasRobots] = await Promise.all([
        page.request.get(`${baseUrl}/sitemap.xml`).then(r => r.ok()).catch(() => false),
        page.request.get(`${baseUrl}/robots.txt`).then(r => r.ok()).catch(() => false),
      ])

      const lcpEntry = domData.paintMetrics.find(p => p.name === 'largest-contentful-paint')
      const fcpEntry = domData.paintMetrics.find(p => p.name === 'first-contentful-paint')

      return {
        url,
        title: domData.title,
        metaDescription: domData.metaDescription,
        headings: { h1: domData.h1s, h2: domData.h2s, h3: domData.h3s },
        images: { total: domData.imageTotal, withoutAlt: domData.imagesWithoutAlt, urls: domData.imageUrls },
        links: { internal: domData.internalLinks, external: domData.externalLinks, broken: 0 },
        wordCount: domData.wordCount,
        loadTime,
        hasSchema: domData.hasSchema,
        hasSitemap,
        hasRobots,
        canonicalUrl: domData.canonicalUrl,
        openGraph: domData.openGraph,
        twitterCard: domData.twitterCard,
        structuredData: domData.structuredData,
        performance: {
          lcp: lcpEntry?.startTime ?? null,
          fid: null, // FID requires real user interaction
          cls: null, // CLS requires layout shift observer
        },
        rawText: domData.rawText,
        scripts: domData.scripts,
        stylesheets: domData.stylesheets,
        isJavaScriptRendered: domData.isJavaScriptRendered,
        paintMetrics: domData.paintMetrics,
      }
    } catch (error) {
      logger.error('Playwright crawl failed', { url, error: (error as Error).message })
      throw error
    } finally {
      if (context) await context.close()
    }
  }

  /**
   * Backward-compatible wrapper — existing queue.ts calls ScrapingService.analyzePage()
   * This maps to the new Playwright deep crawl seamlessly.
   */
  static async analyzePage(url: string): Promise<PageAnalysis> {
    try {
      return await this.deepCrawl(url)
    } catch (error) {
      // Fallback: if Playwright fails (e.g. browser not installed yet), use axios+cheerio
      logger.warn('Playwright failed, falling back to axios/cheerio', { url })
      return this.axiosFallback(url)
    }
  }

  /**
   * Lightweight axios + cheerio fallback (for static pages / Playwright unavailable)
   */
  private static async axiosFallback(url: string): Promise<PageAnalysis> {
    const axios = (await import('axios')).default
    const cheerio = await import('cheerio')
    const startTime = Date.now()

    const response = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AI-Marketing-Bot/1.0)' },
    })

    const $ = cheerio.load(response.data)
    const baseUrl = new URL(url).origin
    const [hasSitemap, hasRobots] = await Promise.all([
      axios.get(`${baseUrl}/sitemap.xml`, { timeout: 4000 }).then(() => true).catch(() => false),
      axios.get(`${baseUrl}/robots.txt`, { timeout: 4000 }).then(() => true).catch(() => false),
    ])

    const openGraph: Record<string, string> = {}
    $('meta[property^="og:"]').each((_, el) => {
      const prop = $(el).attr('property')
      const content = $(el).attr('content')
      if (prop && content) openGraph[prop] = content
    })

    const twitterCard: Record<string, string> = {}
    $('meta[name^="twitter:"]').each((_, el) => {
      const name = $(el).attr('name')
      const content = $(el).attr('content')
      if (name && content) twitterCard[name] = content
    })

    const structuredData: any[] = $('script[type="application/ld+json"]')
      .map((_, el) => { try { return JSON.parse($(el).html() || '{}') } catch { return null } })
      .get().filter(Boolean)

    const images = $('img')
    const allLinks = $('a[href]')
    const internalLinks = allLinks.filter((_, el) => {
      const href = $(el).attr('href') || ''
      return href.startsWith('/') || href.includes(new URL(url).hostname)
    }).length

    return {
      url, title: $('title').text().trim(),
      metaDescription: $('meta[name="description"]').attr('content') || '',
      canonicalUrl: $('link[rel="canonical"]').attr('href') || null,
      headings: {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get(),
      },
      images: {
        total: images.length,
        withoutAlt: images.filter((_, el) => !$(el).attr('alt')).length,
        urls: images.map((_, el) => $(el).attr('src')).get().filter(Boolean),
      },
      links: { internal: internalLinks, external: allLinks.length - internalLinks, broken: 0 },
      wordCount: $('body').text().trim().split(/\s+/).length,
      loadTime: Date.now() - startTime,
      hasSchema: $('script[type="application/ld+json"]').length > 0,
      hasSitemap, hasRobots,
      openGraph, twitterCard, structuredData,
      performance: { lcp: null, fid: null, cls: null },
    }
  }

  /** Crawl multiple pages (unchanged API) */
  static async crawlSite(baseUrl: string, maxPages = 50): Promise<PageAnalysis[]> {
    const results: PageAnalysis[] = []
    const visited = new Set<string>()
    const toVisit = [baseUrl]

    while (toVisit.length > 0 && visited.size < maxPages) {
      const url = toVisit.shift()!
      if (visited.has(url)) continue
      try {
        const result = await this.analyzePage(url)
        results.push(result)
        visited.add(url)
      } catch { visited.add(url) }
    }

    return results
  }
}
