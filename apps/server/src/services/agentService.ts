import { PrismaClient } from '@prisma/client'
import { generateReasoning } from './reasoningService'
import { getNewlyDelayed } from './simulationService'

const db = new PrismaClient()

// Track processed delay flags to avoid duplicates
const processedDelays = new Set<string>()
setInterval(() => processedDelays.clear(), 5 * 60 * 1000)

export async function processDelayedTrains(): Promise<void> {
  const delayedRuns = await getNewlyDelayed()

  for (const run of delayedRuns) {
    const existingKey = `delay-${run.id}-${run.delayMinutes}`
    if (processedDelays.has(existingKey)) continue

    // Skip if we already have an unresolved delay flag for this run created in last 2 min
    const recentFlag = await db.agentFlag.findFirst({
      where: {
        trainRunId: run.id,
        type: { in: ['DELAY_DETECTED', 'SEVERELY_DELAYED'] },
        isResolved: false,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
    })
    if (recentFlag) continue

    processedDelays.add(existingKey)

    const route = run.train.Routes[0]
    const stops = route?.stops || []
    const elapsedMinutes = (Date.now() - run.departedAt.getTime()) / 60000
    const nextStop = stops.find((s) => s.cumulativeMinutes > elapsedMinutes)
    const lastStop = stops.filter((s) => s.cumulativeMinutes <= elapsedMinutes).pop()

    const type = run.delayMinutes >= 60 ? 'SEVERELY_DELAYED' : 'DELAY_DETECTED'
    const severity = run.delayMinutes >= 60 ? 'CRITICAL' : run.delayMinutes >= 30 ? 'HIGH' : 'MEDIUM'

    const eta = nextStop
      ? new Date(run.departedAt.getTime() + (nextStop.cumulativeMinutes + run.delayMinutes) * 60000)
          .toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : 'N/A'

    const reasoning = await generateReasoning({
      type,
      trainNumber: run.train.number,
      trainName: run.train.name,
      delayMinutes: run.delayMinutes,
      lastStation: lastStop?.station.name || run.lastStationCode || 'en route',
      nextStation: nextStop?.station.name || run.nextStationCode || 'terminal',
      revisedETA: eta,
    })

    await db.agentFlag.create({
      data: {
        trainRunId: run.id,
        type,
        severity,
        reasoning: reasoning.reasoning,
        suggestion: reasoning.suggestion,
        rawData: JSON.stringify({ delayMinutes: run.delayMinutes, trainNumber: run.train.number }),
        isResolved: false,
      },
    })
  }
}
