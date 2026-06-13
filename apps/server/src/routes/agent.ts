import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole } from '../middleware/auth'

const router = Router()
const db = new PrismaClient()

// GET /api/agent/stats
router.get('/stats', authMiddleware, requireRole('STATION_MASTER'), async (req, res, next) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalActive, delayed, severelyDelayed, criticalFlags, resolvedToday, onTime] =
      await Promise.all([
        db.trainRun.count({ where: { status: { not: 'CANCELLED' } } }),
        db.trainRun.count({ where: { status: 'DELAYED' } }),
        db.trainRun.count({ where: { status: 'SEVERELY_DELAYED' } }),
        db.agentFlag.count({ where: { severity: 'CRITICAL', isResolved: false } }),
        db.agentFlag.count({ where: { isResolved: true, resolvedAt: { gte: today } } }),
        db.trainRun.count({ where: { status: 'ON_TIME' } }),
      ])

    res.json({ totalActive, delayed, severelyDelayed, criticalFlags, resolvedToday, onTime })
  } catch (err) { next(err) }
})

export default router
