import { Router } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const db = new PrismaClient()

router.get('/:number', async (req, res, next) => {
  try {
    const pnr = await db.pNR.findUnique({
      where: { number: req.params.number },
      include: {
        train: {
          include: {
            Routes: {
              include: {
                stops: { include: { station: true }, orderBy: { stopOrder: 'asc' } },
              },
            },
            TrainRuns: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { AgentFlags: { where: { isResolved: false } } },
            },
          },
        },
      },
    })
    if (!pnr) return res.status(404).json({ error: 'PNR not found. Try: 4812657390' })
    res.json(pnr)
  } catch (err) { next(err) }
})

export default router
