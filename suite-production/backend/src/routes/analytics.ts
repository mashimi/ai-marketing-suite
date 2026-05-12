import { Router } from 'express'
import { prisma } from '../lib/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { asyncHandler, AppError } from '../middleware/error'
import { subDays, format } from 'date-fns'

const router = Router()
router.use(authenticate)

router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    const { projectId, days = '30' } = req.query

    const project = await prisma.project.findFirst({
      where: {
        id: projectId as string,
        userId: req.user!.id,
      },
    })

    if (!project) {
      throw new AppError(404, 'Project not found')
    }

    const daysNum = parseInt(days as string)
    const startDate = subDays(new Date(), daysNum)

    const analytics = await prisma.analyticsData.findMany({
      where: {
        projectId: projectId as string,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'asc' },
    })

    // If no data, generate mock data for demo
    if (analytics.length === 0) {
      const mockData = generateMockAnalytics(projectId as string, daysNum)
      return res.json(mockData)
    }

    res.json(analytics)
  })
)

function generateMockAnalytics(projectId: string, days: number) {
  const data = []
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i)
    const baseTraffic = 1500 + Math.sin(i * 0.2) * 300
    const organic = Math.floor(baseTraffic * 0.65 + Math.random() * 200)
    const direct = Math.floor(baseTraffic * 0.15 + Math.random() * 100)
    const referral = Math.floor(baseTraffic * 0.12 + Math.random() * 80)
    const social = Math.floor(baseTraffic * 0.08 + Math.random() * 60)

    data.push({
      id: `mock-${i}`,
      projectId,
      date: format(date, 'yyyy-MM-dd'),
      traffic: organic + direct + referral + social,
      organic,
      direct,
      referral,
      social,
      conversions: Math.floor((organic + direct) * 0.032),
      revenue: Math.floor((organic + direct) * 0.032 * 49),
      bounceRate: 35 + Math.random() * 15,
      avgSessionDuration: 120 + Math.random() * 180,
    })
  }
  return data
}

export default router
