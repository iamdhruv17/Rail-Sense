import { PrismaClient } from '@prisma/client'
import { generateReasoning } from './reasoningService'

const db = new PrismaClient()

// Track which conflicts we've already flagged (within last 5 min) to avoid spam
const recentFlags = new Set<string>()
setInterval(() => recentFlags.clear(), 5 * 60 * 1000)

interface ConflictInfo {
  type: 'CASCADE_RISK' | 'PLATFORM_CONFLICT'
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL'
  trainRunId: string
  trainNumber: string
  trainName: string
  otherTrain: string
  stationName: string
  stationCode: string
  platformNumber: number
  alternatePlatform: number
  conflictTime: string
  affectedPassengers: number
  delayMinutes: number
}

export async function detectConflicts(): Promise<ConflictInfo[]> {
  const runs = await db.trainRun.findMany({
    where: { status: { in: ['DELAYED', 'SEVERELY_DELAYED'] } },
    include: {
      train: {
        include: {
          Routes: {
            include: {
              stops: {
                include: { station: true },
                orderBy: { stopOrder: 'asc' },
              },
            },
          },
        },
      },
    },
  })

  const conflicts: ConflictInfo[] = []
  const now = Date.now()

  for (const run of runs) {
    const route = run.train.Routes[0]
    if (!route) continue

    const elapsedMinutes = (now - run.departedAt.getTime()) / 60000

    // Find next upcoming stop for this delayed train
    const nextStop = route.stops.find((s) => s.cumulativeMinutes > elapsedMinutes)
    if (!nextStop) continue

    const eta = nextStop.cumulativeMinutes + run.delayMinutes
    const etaTime = new Date(run.departedAt.getTime() + eta * 60000)
    const etaStr = etaTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

    // Check other runs at same station and platform within 15 min window
    const otherRuns = await db.trainRun.findMany({
      where: {
        id: { not: run.id },
        status: { not: 'CANCELLED' },
      },
      include: {
        train: {
          include: {
            Routes: {
              include: {
                stops: {
                  where: { stationId: nextStop.stationId },
                  include: { station: true },
                },
              },
            },
          },
        },
      },
    })

    for (const other of otherRuns) {
      const otherRoute = other.train.Routes[0]
      if (!otherRoute) continue

      const otherStop = otherRoute.stops.find((s) => s.stationId === nextStop.stationId)
      if (!otherStop) continue

      // Check if same platform
      if (otherStop.platformNumber !== nextStop.platformNumber) continue

      const otherEta = otherStop.cumulativeMinutes + other.delayMinutes
      const otherEtaMs = other.departedAt.getTime() + otherEta * 60000
      const delayedEtaMs = run.departedAt.getTime() + eta * 60000

      const timeDiffMin = Math.abs(delayedEtaMs - otherEtaMs) / 60000
      if (timeDiffMin > 20) continue // More than 20 min apart — no conflict

      const flagKey = `${run.id}-${other.id}-${nextStop.stationId}`
      if (recentFlags.has(flagKey)) continue
      recentFlags.add(flagKey)

      conflicts.push({
        type: run.delayMinutes >= 30 ? 'CASCADE_RISK' : 'PLATFORM_CONFLICT',
        severity: run.delayMinutes >= 60 ? 'CRITICAL' : run.delayMinutes >= 30 ? 'HIGH' : 'MEDIUM',
        trainRunId: run.id,
        trainNumber: run.train.number,
        trainName: run.train.name,
        otherTrain: `${other.train.name} (${other.train.number})`,
        stationName: nextStop.station.name,
        stationCode: nextStop.station.code,
        platformNumber: nextStop.platformNumber,
        alternatePlatform: nextStop.platformNumber === 1 ? 2 : nextStop.platformNumber - 1,
        conflictTime: etaStr,
        affectedPassengers: Math.floor(Math.random() * 800) + 200,
        delayMinutes: run.delayMinutes,
      })
    }
  }

  return conflicts
}

export async function createFlagsForConflicts(conflicts: ConflictInfo[]) {
  for (const conflict of conflicts) {
    const reasoning = await generateReasoning({
      type: conflict.type,
      trainNumber: conflict.trainNumber,
      trainName: conflict.trainName,
      delayMinutes: conflict.delayMinutes,
      stationName: conflict.stationName,
      conflictTime: conflict.conflictTime,
      otherTrain: conflict.otherTrain,
      platformNumber: conflict.platformNumber,
      alternatePlatform: conflict.alternatePlatform,
      affectedPassengers: conflict.affectedPassengers,
    })

    await db.agentFlag.create({
      data: {
        trainRunId: conflict.trainRunId,
        type: conflict.type,
        severity: conflict.severity,
        reasoning: reasoning.reasoning,
        suggestion: reasoning.suggestion,
        rawData: JSON.stringify(conflict),
        isResolved: false,
      },
    })
  }
}
