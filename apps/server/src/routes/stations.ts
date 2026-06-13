import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const db = new PrismaClient()

router.get('/', async (req, res, next) => {
  try {
    const stations = await db.station.findMany({ orderBy: { name: 'asc' } })
    res.json(stations)
  } catch (err) { next(err) }
})

router.get('/:code', async (req, res, next) => {
  try {
    const station = await db.station.findUnique({ where: { code: req.params.code } })
    if (!station) return res.status(404).json({ error: 'Station not found' })
    res.json(station)
  } catch (err) { next(err) }
})

export default router
