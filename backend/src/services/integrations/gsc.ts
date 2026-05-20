import { google } from 'googleapis'
import { prisma } from '../../lib/db'
import { logger } from '../../lib/logger'

export class SearchConsoleService {
  private async getAuth(integrationId: string) {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    })
    if (!integration) throw new Error('Integration not found')

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    })

    // Auto-refresh if needed
    if (integration.refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken()
        await prisma.integration.update({
          where: { id: integrationId },
          data: {
            accessToken: credentials.access_token || integration.accessToken,
            lastSyncAt: new Date(),
          }
        })
        oauth2Client.setCredentials(credentials)
      } catch (error) {
        logger.error('Failed to refresh GSC access token', { error, integrationId })
      }
    }

    return google.webmasters({ version: 'v3', auth: oauth2Client })
  }

  async syncSearchData(integrationId: string, projectId: string, siteUrl: string, days: number = 30) {
    const webmasters = await this.getAuth(integrationId)
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    try {
      const res = await webmasters.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query', 'page', 'date'],
          rowLimit: 25000,
        }
      })

      const rows = res.data.rows || []

      // Batch insert with upsert
      for (const row of rows) {
        const [query, page, date] = row.keys || ['', '', '']
        await prisma.searchConsoleData.upsert({
          where: {
            projectId_query_page_date: {
              projectId,
              query,
              page,
              date: new Date(date),
            }
          },
          update: {
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          },
          create: {
            projectId,
            query,
            page,
            date: new Date(date),
            clicks: row.clicks || 0,
            impressions: row.impressions || 0,
            ctr: row.ctr || 0,
            position: row.position || 0,
          }
        })
      }

      logger.info('GSC sync complete', { projectId, rows: rows.length })
      return { synced: rows.length }
    } catch (error) {
      logger.error('GSC sync failed', { error, projectId })
      throw error
    }
  }

  async getTopQueries(projectId: string, limit: number = 50) {
    return prisma.searchConsoleData.groupBy({
      by: ['query'],
      where: { projectId },
      _sum: { clicks: true, impressions: true },
      _avg: { position: true, ctr: true },
      orderBy: { _sum: { clicks: 'desc' } },
      take: limit,
    })
  }
}

export const gscService = new SearchConsoleService()
