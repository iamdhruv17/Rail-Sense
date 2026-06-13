import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// Haversine formula for distance between two lat/lng points (km)
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

export interface PositionResult {
  lat: number
  lng: number
  speed: number
  lastStationCode: string
  lastStationName: string
  nextStationCode: string | null
  nextStationName: string | null
  progressPercent: number
  segmentProgress: number
  arrived: boolean
}

function calculatePosition(
  departedAt: Date,
  delayMinutes: number,
  totalMinutes: number,
  stops: Array<{
    cumulativeMinutes: number
    station: { code: string; name: string; lat: number; lng: number }
  }>
): PositionResult {
  const now = Date.now()
  const elapsedMs = now - departedAt.getTime()
  const elapsedMinutes = elapsedMs / 60000 // actual elapsed minutes (no delay added for simulation)

  // If not departed yet
  if (elapsedMinutes < 0) {
    const first = stops[0]
    return {
      lat: first.station.lat,
      lng: first.station.lng,
      speed: 0,
      lastStationCode: first.station.code,
      lastStationName: first.station.name,
      nextStationCode: stops[1]?.station.code || null,
      nextStationName: stops[1]?.station.name || null,
      progressPercent: 0,
      segmentProgress: 0,
      arrived: false,
    }
  }

  const last = stops[stops.length - 1]

  // If arrived at terminal
  if (elapsedMinutes >= totalMinutes) {
    return {
      lat: last.station.lat,
      lng: last.station.lng,
      speed: 0,
      lastStationCode: last.station.code,
      lastStationName: last.station.name,
      nextStationCode: null,
      nextStationName: null,
      progressPercent: 100,
      segmentProgress: 1,
      arrived: true,
    }
  }

  // Find current segment
  let fromStop = stops[0]
  let toStop = stops[1] || stops[0]
  let segmentIdx = 0

  for (let i = 0; i < stops.length - 1; i++) {
    if (
      elapsedMinutes >= stops[i].cumulativeMinutes &&
      elapsedMinutes < stops[i + 1].cumulativeMinutes
    ) {
      fromStop = stops[i]
      toStop = stops[i + 1]
      segmentIdx = i
      break
    }
    if (elapsedMinutes >= stops[i + 1].cumulativeMinutes) {
      fromStop = stops[i + 1]
      toStop = stops[Math.min(i + 2, stops.length - 1)]
      segmentIdx = i + 1
    }
  }

  const segDuration = toStop.cumulativeMinutes - fromStop.cumulativeMinutes
  const segElapsed = elapsedMinutes - fromStop.cumulativeMinutes
  const t = segDuration > 0 ? Math.max(0, Math.min(1, segElapsed / segDuration)) : 1

  const lat = lerp(fromStop.station.lat, toStop.station.lat, t)
  const lng = lerp(fromStop.station.lng, toStop.station.lng, t)

  // Estimate speed
  const distKm = haversine(
    fromStop.station.lat,
    fromStop.station.lng,
    toStop.station.lat,
    toStop.station.lng
  )
  const speed = segDuration > 0 ? Math.round((distKm / (segDuration / 60)) * (0.8 + Math.random() * 0.4)) : 0

  const progressPercent = Math.min(100, (elapsedMinutes / totalMinutes) * 100)

  return {
    lat,
    lng,
    speed: Math.min(speed, 160),
    lastStationCode: fromStop.station.code,
    lastStationName: fromStop.station.name,
    nextStationCode: toStop.station.code !== fromStop.station.code ? toStop.station.code : null,
    nextStationName: toStop.station.code !== fromStop.station.code ? toStop.station.name : null,
    progressPercent,
    segmentProgress: t,
    arrived: false,
  }
}

// In-memory delay state per trainRun
const delayState: Map<string, { minutes: number; lastChanged: number }> = new Map()

function evolveDelay(trainRunId: string, currentDelay: number): number {
  const state = delayState.get(trainRunId) || { minutes: currentDelay, lastChanged: 0 }
  const roll = Math.random()

  let newDelay = state.minutes

  if (roll < 0.08) {
    // Add delay: 5-40 min
    newDelay += Math.floor(Math.random() * 36) + 5
  } else if (roll < 0.08 + 0.15 && newDelay > 0) {
    // Recover: -5 min
    newDelay = Math.max(0, newDelay - 5)
  }

  delayState.set(trainRunId, { minutes: newDelay, lastChanged: Date.now() })
  return newDelay
}

export async function updateAllPositions(): Promise<void> {
  const runs = await db.trainRun.findMany({
    where: { status: { not: 'CANCELLED' } },
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

  for (const run of runs) {
    const route = run.train.Routes[0]
    if (!route || route.stops.length < 2) continue

    const newDelay = evolveDelay(run.id, run.delayMinutes)
    const pos = calculatePosition(run.departedAt, newDelay, run.totalMinutes, route.stops)

    let status: string = 'ON_TIME'
    if (pos.arrived) {
      status = 'ON_TIME'
    } else if (newDelay >= 60) {
      status = 'SEVERELY_DELAYED'
    } else if (newDelay > 0) {
      status = 'DELAYED'
    }

    await db.trainRun.update({
      where: { id: run.id },
      data: {
        currentLat: pos.lat,
        currentLng: pos.lng,
        currentSpeed: pos.speed,
        lastStationCode: pos.lastStationCode,
        nextStationCode: pos.nextStationCode,
        progressPercent: pos.progressPercent,
        delayMinutes: newDelay,
        status,
      },
    })
  }
}

export async function getAllPositions() {
  const runs = await db.trainRun.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      train: true,
    },
  })

  return runs.map((run) => ({
    trainId: run.trainId,
    trainRunId: run.id,
    trainNumber: run.train.number,
    trainName: run.train.name,
    trainType: run.train.type,
    lat: run.currentLat ?? 28.6,
    lng: run.currentLng ?? 77.2,
    speed: run.currentSpeed,
    delayMinutes: run.delayMinutes,
    status: run.status,
    lastStation: run.lastStationCode ?? '',
    lastStationName: '',
    nextStation: run.nextStationCode ?? '',
    nextStationName: '',
    progressPercent: run.progressPercent,
    updatedAt: run.updatedAt.toISOString(),
  }))
}

export async function getNewlyDelayed() {
  return db.trainRun.findMany({
    where: { status: { in: ['DELAYED', 'SEVERELY_DELAYED'] } },
    include: {
      train: { include: { Routes: { include: { stops: { include: { station: true }, orderBy: { stopOrder: 'asc' } } } } } },
      AgentFlags: { where: { isResolved: false, createdAt: { gte: new Date(Date.now() - 35000) } } },
    },
  })
}
