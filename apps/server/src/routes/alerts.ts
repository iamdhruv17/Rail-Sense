import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth'
import { emitNewFlag } from '../services/socketService'

const router = Router()
const db = new PrismaClient()

// GET /api/flags — all flags (protected)
router.get('/', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { severity, type, isResolved, trainNumber } = req.query
    const where: any = {}
    if (severity) where.severity = severity
    if (type) where.type = type
    if (isResolved !== undefined) where.isResolved = isResolved === 'true'
    if (trainNumber) {
      where.trainRun = { train: { number: trainNumber } }
    }
    const flags = await db.agentFlag.findMany({
      where,
      include: { trainRun: { include: { train: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    res.json(flags)
  } catch (err) { next(err) }
})

// POST /api/flags/:id/resolve
router.post('/:id/resolve', authMiddleware, requireRole('STATION_MASTER'), async (req: AuthRequest, res, next) => {
  try {
    const { resolution } = req.body
    const flag = await db.agentFlag.update({
      where: { id: req.params.id },
      data: {
        isResolved: true,
        resolvedBy: req.user!.name,
        resolvedAt: new Date(),
        resolution: resolution || 'Resolved by station master',
      },
      include: { trainRun: { include: { train: true } } },
    })
    emitNewFlag({ ...flag, resolved: true })
    res.json(flag)
  } catch (err) { next(err) }
})

export default router
