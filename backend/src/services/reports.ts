import puppeteer from 'puppeteer'
import { prisma } from '../lib/db'
import { logger } from '../lib/logger'

export class ReportService {
  async generateSEOReport(projectId: string): Promise<Buffer> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        seoAudits: { orderBy: { timestamp: 'desc' }, take: 1 },
        keywords: { orderBy: { volume: 'desc' }, take: 20 },
        agents: { include: { metrics: true } },
      }
    })

    if (!project) throw new Error('Project not found')

    const audit: any = project.seoAudits[0]

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; background: white; }
        .header { border-bottom: 3px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; border: 8px solid ${audit?.overallScore >= 80 ? '#22c55e' : audit?.overallScore >= 60 ? '#eab308' : '#ef4444'}; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; margin: 20px auto; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #6366f1; border-left: 4px solid #6366f1; padding-left: 12px; font-size: 1.5rem; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; color: #475569; }
        .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .metric-box { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #f1f5f9; }
        .metric-value { font-size: 28px; font-weight: bold; color: #6366f1; }
        .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SEO Strategy & Audit Report</h1>
        <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 4px;">${project.name}</p>
        <p style="color: #64748b;">${project.url}</p>
        <p style="color: #64748b; font-size: 0.9rem;">Generated on ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="section" style="text-align: center;">
        <h2>Overall Performance Score</h2>
        <div class="score-circle">${audit?.overallScore || 'N/A'}</div>
        <p style="font-weight: 600; color: #475569;">${audit?.overallScore >= 80 ? 'EXCELLENT' : audit?.overallScore >= 60 ? 'GOOD' : 'NEEDS OPTIMIZATION'}</p>
      </div>

      <div class="section">
        <h2>Category Breakdown</h2>
        <div class="metric-grid">
          ${audit?.categories?.map((cat: any) => `
            <div class="metric-box">
              <div class="metric-value">${cat.score}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: 600; text-transform: uppercase;">${cat.name}</div>
            </div>
          `).join('') || '<p>No category data available</p>'}
        </div>
      </div>

      <div class="section">
        <h2>Target Keyword Performance</h2>
        <table>
          <thead>
            <tr><th>Keyword</th><th>Search Volume</th><th>Difficulty</th><th>Position</th></tr>
          </thead>
          <tbody>
            ${project.keywords.length > 0 ? project.keywords.map(kw => `
              <tr>
                <td style="font-weight: 500;">${kw.keyword}</td>
                <td>${kw.volume.toLocaleString()}</td>
                <td>${kw.difficulty}%</td>
                <td>${kw.currentPosition || '—'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4">No keywords tracked</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>AI Agent Impact</h2>
        <table>
          <thead>
            <tr><th>Agent Name</th><th>Tasks Executed</th><th>Success Rate</th><th>Business Impact</th></tr>
          </thead>
          <tbody>
            ${project.agents.length > 0 ? project.agents.map(agent => `
              <tr>
                <td style="font-weight: 500;">${agent.name}</td>
                <td>${agent.metrics?.tasksCompleted || 0}</td>
                <td>${agent.metrics?.successRate?.toFixed(1) || 0}%</td>
                <td><span style="color: #6366f1; font-weight: 600;">${agent.metrics?.impactScore || 0}/100</span></td>
              </tr>
            `).join('') : '<tr><td colspan="4">No agent data available</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} AI Marketing Suite. Confidential Strategy Document.</p>
      </div>
    </body>
    </html>
    `

    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    })
    
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'networkidle0' as any })
      const pdf = await page.pdf({ 
        format: 'A4', 
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      })
      return Buffer.from(pdf)
    } finally {
      await browser.close()
    }
  }
}

export const reportService = new ReportService()
