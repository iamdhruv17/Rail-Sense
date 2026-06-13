import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth'

const router = Router()
const db = new PrismaClient()

// GET /api/trains — all active train runs with positions
router.get('/', async (req, res, next) => {
  try {
    const runs = await db.trainRun.findMany({
      where: { status: { not: 'CANCELLED' } },
      include: { train: true },
      orderBy: { updatedAt: 'desc' },
    })
    const data = runs.map((run) => ({
      id: run.id,
      trainId: run.trainId,
      trainNumber: run.train.number,
      trainName: run.train.name,
      trainType: run.train.type,
      status: run.status,
      delayMinutes: run.delayMinutes,
      lat: run.currentLat,
      lng: run.currentLng,
      speed: run.currentSpeed,
      lastStationCode: run.lastStationCode,
      nextStationCode: run.nextStationCode,
      progressPercent: run.progressPercent,
      updatedAt: run.updatedAt,
    }))
    res.json(data)
  } catch (err) { next(err) }
})

// GET /api/trains/:trainNumber — single train details
router.get('/:trainNumber', async (req, res, next) => {
  try {
    const train = await db.train.findUnique({
      where: { number: req.params.trainNumber },
      include: {
        Routes: {
          include: {
            stops: {
              include: { station: true },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
        TrainRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            AgentFlags: { where: { isResolved: false }, orderBy: { createdAt: 'desc' } },
          },
        },
      },
    })
    if (!train) return res.status(404).json({ error: 'Train not found' })
    res.json(train)
  } catch (err) { next(err) }
})

// GET /api/trains/:trainNumber/route — stops with live ETAs
router.get('/:trainNumber/route', async (req, res, next) => {
  try {
    const train = await db.train.findUnique({
      where: { number: req.params.trainNumber },
      include: {
        Routes: {
          include: {
            stops: {
              include: { station: true },
              orderBy: { stopOrder: 'asc' },
            },
          },
        },
        TrainRuns: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!train) return res.status(404).json({ error: 'Train not found' })
    const run = train.TrainRuns[0]
    const route = train.Routes[0]
    if (!route) return res.status(404).json({ error: 'Route not found' })

    const stopsWithETA = route.stops.map((stop) => {
      const elapsedMin = run ? (Date.now() - run.departedAt.getTime()) / 60000 : 0
      const delay = run?.delayMinutes || 0
      const scheduledMin = stop.cumulativeMinutes
      const liveMin = scheduledMin + delay
      const liveETA = new Date(((run?.departedAt || new Date()).getTime()) + liveMin * 60000)
        .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      let stopStatus: string = 'UPCOMING'
      if (elapsedMin > scheduledMin + 5) stopStatus = 'PASSED'
      else if (Math.abs(elapsedMin - scheduledMin) <= 5) stopStatus = 'CURRENT'

      return {
        ...stop,
        liveETA,
        liveDelay: delay,
        stopStatus,
      }
    })

    res.json({ ...route, stops: stopsWithETA, currentRun: run })
  } catch (err) { next(err) }
})

// GET /api/trains/:trainNumber/flags
router.get('/:trainNumber/flags', async (req, res, next) => {
  try {
    const train = await db.train.findUnique({ where: { number: req.params.trainNumber } })
    if (!train) return res.status(404).json({ error: 'Train not found' })
    const run = await db.trainRun.findFirst({
      where: { trainId: train.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!run) return res.json([])
    const flags = await db.agentFlag.findMany({
      where: { trainRunId: run.id, isResolved: false },
      orderBy: { createdAt: 'desc' },
    })
    res.json(flags)
  } catch (err) { next(err) }
})

// POST /api/trains/:id/delay — manually add delay (demo)
router.post('/:id/delay', authMiddleware, requireRole('STATION_MASTER'), async (req: AuthRequest, res, next) => {
  try {
    const { minutes = 20 } = req.body
    const run = await db.trainRun.findFirst({
      where: { trainId: req.params.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!run) return res.status(404).json({ error: 'Train run not found' })
    const newDelay = run.delayMinutes + minutes
    const updated = await db.trainRun.update({
      where: { id: run.id },
      data: {
        delayMinutes: newDelay,
        status: newDelay >= 60 ? 'SEVERELY_DELAYED' : 'DELAYED',
      },
    })
    res.json({ message: `Added ${minutes} min delay`, newDelay, run: updated })
  } catch (err) { next(err) }
})

export default router
