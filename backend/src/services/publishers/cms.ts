import axios from 'axios'
import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'

export interface CMSConfig {
  type: 'wordpress' | 'webflow' | 'contentful' | 'ghost' | 'webhook'
  endpoint: string
  apiKey: string
  options?: Record<string, any>
}

export class CMSPublisher {
  async publish(contentId: string, config: CMSConfig): Promise<{ url: string; platformId: string }> {
    const content = await prisma.contentPiece.findUnique({
      where: { id: contentId }
    })
    if (!content) throw new Error('Content not found')

    try {
      switch (config.type) {
        case 'wordpress':
          return this.publishWordPress(content, config)
        case 'webhook':
          return this.publishWebhook(content, config)
        default:
          throw new Error(`Unsupported CMS: ${config.type}`)
      }
    } catch (error) {
      logger.error('CMS publication failed', { error, contentId, platform: config.type })
      throw error
    }
  }

  private async publishWordPress(content: any, config: CMSConfig) {
    const res = await axios.post(
      `${config.endpoint}/wp-json/wp/v2/posts`,
      {
        title: content.title,
        content: content.content,
        status: 'publish',
        categories: content.keywords,
      },
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`user:${config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        }
      }
    )
    return { url: res.data.link, platformId: res.data.id.toString() }
  }

  private async publishWebhook(content: any, config: CMSConfig) {
    const res = await axios.post(config.endpoint, {
      title: content.title,
      content: content.content,
      metadata: {
        keywords: content.keywords,
        seoScore: content.seoScore,
        publishedAt: new Date().toISOString(),
      }
    }, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` }
    })
    return { url: res.data.url || config.endpoint, platformId: res.data.id || 'webhook' }
  }
}

export const cmsPublisher = new CMSPublisher()
