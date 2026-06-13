'use client'

import { useEffect, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { trainsApi } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { TrainPosition, TrainDetail, RouteStop, AgentFlag } from '@/lib/types'

const LiveMap = dynamic(() => import('@/components/map/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-bg-secondary text-text-muted">
      <div className="flex flex-col items-center gap-2">
        <Spinner size="lg" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading Vector Map Engine...</p>
      </div>
    </div>
  ),
})

export default function TrackPage() {
  const [positions, setPositions] = useState<TrainPosition[]>([])
  const [selectedTrainNum, setSelectedTrainNum] = useState<string | null>(null)
  const [trainDetail, setTrainDetail] = useState<TrainDetail | null>(null)
  const [routeStops, setRouteStops] = useState<RouteStop[]>([])
  const [flags, setFlags] = useState<AgentFlag[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Fetch initial trains list
  useEffect(() => {
    async function loadTrains() {
      try {
        const res = await trainsApi.getAll()
        setPositions(res.data)
      } catch (err) {
        console.error('Failed to fetch train positions:', err)
      }
    }
    loadTrains()

    // Socket.io integration
    const socket = getSocket()
    socket.on('trains:positions', (data: TrainPosition[]) => {
      startTransition(() => {
        setPositions(data)
      })
    })

    return () => {
      socket.off('trains:positions')
    }
  }, [])

  // Update selected train detail when train position updates OR selected train number changes
  useEffect(() => {
    if (!selectedTrainNum) {
      setTrainDetail(null)
      setRouteStops([])
      setFlags([])
      return
    }

    async function fetchDetails() {
      setLoadingDetail(true)
      try {
        const [detailRes, routeRes, flagsRes] = await Promise.all([
          trainsApi.getOne(selectedTrainNum),
          trainsApi.getRoute(selectedTrainNum),
          trainsApi.getFlags(selectedTrainNum),
        ])
        setTrainDetail(detailRes.data)
        setRouteStops(routeRes.data.stops || [])
        setFlags(flagsRes.data || [])
      } catch (err) {
        console.error('Failed to load train details:', err)
      } finally {
        setLoadingDetail(false)
      }
    }

    fetchDetails()
  }, [selectedTrainNum])

  // Real-time flag updater
  useEffect(() => {
    if (!selectedTrainNum) return
    const socket = getSocket()
    const handler = (newFlag: AgentFlag) => {
      if (newFlag.trainRun?.train?.number === selectedTrainNum) {
        setFlags((prev) => {
          // Replace or append
          const exists = prev.findIndex((f) => f.id === newFlag.id)
          if (exists !== -1) {
            const copy = [...prev]
            copy[exists] = newFlag
            return copy.filter((f) => !f.isResolved)
          }
          return newFlag.isResolved ? prev : [newFlag, ...prev]
        })
      }
    }
    socket.on('agent:flag', handler)
    return () => {
      socket.off('agent:flag', handler)
    }
  }, [selectedTrainNum])

  const filteredTrains = positions.filter((train) => {
    const q = searchQuery.toLowerCase()
    return (
      train.trainName.toLowerCase().includes(q) ||
      train.trainNumber.toLowerCase().includes(q) ||
      train.lastStation.toLowerCase().includes(q) ||
      train.nextStation.toLowerCase().includes(q)
    )
  })

  const selectedPosition = positions.find((p) => p.trainNumber === selectedTrainNum)

  // Generate coordinates array for the Leaflet polyline
  const routeCoords: [number, number][] = routeStops.map((stop) => [stop.station.lat, stop.station.lng])

  // Filter coordinates that have already been passed
  const passedCoords: [number, number][] = []
  if (selectedPosition && routeStops.length > 0) {
    let foundCurrent = false
    for (const stop of routeStops) {
      passedCoords.push([stop.station.lat, stop.station.lng])
      if (stop.stopStatus === 'CURRENT') {
        foundCurrent = true
        // Add current train position as the final segment
        passedCoords.push([selectedPosition.lat, selectedPosition.lng])
        break
      }
    }
    if (!foundCurrent) {
      // Fallback: estimate passed coords based on progress percentage
      const passedCount = Math.max(1, Math.round((selectedPosition.progressPercent / 100) * routeCoords.length))
      passedCoords.push(...routeCoords.slice(0, passedCount))
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col pt-14">
      <Navbar />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* Left Panel: Train Search and List */}
        <div className="w-full lg:w-80 border-r border-border bg-bg-secondary/40 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold tracking-tight mb-2">Live Train Operations</h1>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search train, number, station..."
                className="w-full bg-bg-primary border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-red/50 transition-colors"
              />
              <span className="absolute left-3 top-2.5 text-text-dim text-xs">🔍</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
              <span>{positions.length} Active Runs</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Sync
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/60">
            {filteredTrains.length === 0 ? (
              <div className="p-8 text-center text-text-dim text-sm">No active trains found.</div>
            ) : (
              filteredTrains.map((train) => {
                const active = selectedTrainNum === train.trainNumber
                const speed = Math.round(train.speed)
                return (
                  <div
                    key={train.trainRunId}
                    onClick={() => setSelectedTrainNum(train.trainNumber)}
                    className={`p-4 cursor-pointer transition-colors ${
                      active ? 'bg-accent-red/5 border-l-2 border-accent-red' : 'hover:bg-bg-secondary/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{train.trainName}</div>
                        <div className="text-xs text-text-dim mt-0.5">{train.trainNumber}</div>
                      </div>
                      <StatusBadge status={train.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-text-muted">
                      <div>
                        <span className="text-text-dim">Speed:</span> {speed} km/h
                      </div>
                      <div className="text-right">
                        <span className="text-text-dim">Delay:</span>{' '}
                        <span className={train.delayMinutes > 0 ? 'text-accent-amber' : 'text-accent-green'}>
                          {train.delayMinutes > 0 ? `+${train.delayMinutes} min` : 'On time'}
                        </span>
                      </div>
                      <div className="col-span-2 truncate">
                        <span className="text-text-dim">Sector:</span> {train.lastStation} ➔ {train.nextStation || 'Terminus'}
                      </div>
                    </div>

                    {/* Simple progress bar */}
                    <div className="w-full bg-bg-primary h-1 rounded-full overflow-hidden mt-2 border border-border/10">
                      <div
                        className="bg-accent-red h-full transition-all duration-500"
                        style={{ width: `${train.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Center: Live Map */}
        <div className="flex-1 relative border-b lg:border-b-0 border-border">
          <LiveMap
            positions={positions}
            onTrainClick={(t) => setSelectedTrainNum(t.trainNumber)}
            selectedTrain={selectedTrainNum}
            routeCoords={routeCoords}
            passedCoords={passedCoords}
          />
        </div>

        {/* Right Panel: Selected Train Details */}
        <div className="w-full lg:w-96 border-l border-border bg-bg-secondary/40 flex flex-col flex-shrink-0">
          {selectedTrainNum ? (
            loadingDetail && !trainDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <Spinner size="lg" />
                <p className="text-xs text-text-muted mt-2 font-semibold uppercase tracking-wider">
                  Analyzing route telemetry...
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Details Header */}
                <div className="p-4 border-b border-border bg-bg-secondary">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedTrainNum(null)}
                      className="text-xs text-text-dim hover:text-text-primary mb-2 flex items-center gap-1"
                    >
                      <span>←</span> Close details
                    </button>
                    {selectedPosition && <StatusBadge status={selectedPosition.status} />}
                  </div>
                  <h2 className="text-base font-bold text-text-primary truncate">
                    {trainDetail?.name || selectedPosition?.trainName}
                  </h2>
                  <p className="text-xs text-text-dim mt-0.5">
                    No. {trainDetail?.number || selectedPosition?.trainNumber} | Type: {trainDetail?.type}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2 rounded bg-bg-primary/50 border border-border">
                      <div className="text-[10px] text-text-dim uppercase font-semibold">Speed</div>
                      <div className="text-sm font-bold mt-0.5">
                        {selectedPosition ? Math.round(selectedPosition.speed) : 0} km/h
                      </div>
                    </div>
                    <div className="p-2 rounded bg-bg-primary/50 border border-border">
                      <div className="text-[10px] text-text-dim uppercase font-semibold">Delay</div>
                      <div className="text-sm font-bold mt-0.5 text-accent-amber">
                        +{selectedPosition?.delayMinutes || 0} min
                      </div>
                    </div>
                    <div className="p-2 rounded bg-bg-primary/50 border border-border">
                      <div className="text-[10px] text-text-dim uppercase font-semibold">Progress</div>
                      <div className="text-sm font-bold mt-0.5">
                        {selectedPosition ? Math.round(selectedPosition.progressPercent) : 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* AI Agent Flag warnings */}
                  {flags.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-accent-red uppercase tracking-wider">
                        ⚠️ AI Operations Warning ({flags.length})
                      </h3>
                      {flags.map((flag) => (
                        <div
                          key={flag.id}
                          className="p-3 bg-accent-red/5 border border-accent-red/25 rounded-lg space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-accent-red flex items-center gap-1">
                              <span>🚨</span> {flag.type.replace('_', ' ')}
                            </span>
                            <SeverityBadge severity={flag.severity} />
                          </div>
                          <p className="text-text-muted leading-relaxed">{flag.reasoning}</p>
                          <div className="p-2 rounded bg-bg-primary/60 border border-border/40 text-accent-amber font-medium">
                            <span className="font-semibold text-text-primary text-[10px] uppercase block mb-0.5">
                              Action Recommendation
                            </span>
                            {flag.suggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Route Timeline */}
                  <div>
                    <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-4">
                      Route Progression
                    </h3>
                    <div className="relative border-l border-border ml-3 pl-5 space-y-5">
                      {routeStops.map((stop) => {
                        const isPassed = stop.stopStatus === 'PASSED'
                        const isCurrent = stop.stopStatus === 'CURRENT'
                        const arrivalTime = stop.scheduledArrival || stop.scheduledDeparture || '--:--'

                        return (
                          <div key={stop.id} className="relative">
                            {/* Bullet Circle */}
                            <span
                              className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 transition-colors ${
                                isCurrent
                                  ? 'bg-accent-red border-accent-red shadow-[0_0_8px_#E8213B]'
                                  : isPassed
                                  ? 'bg-bg-primary border-text-muted'
                                  : 'bg-bg-primary border-border'
                              }`}
                            />

                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className={`text-xs font-bold ${isCurrent ? 'text-accent-red' : ''}`}>
                                  {stop.station.name}{' '}
                                  <span className="text-[10px] font-normal text-text-dim bg-bg-primary/60 border border-border px-1 rounded ml-1">
                                    {stop.station.code}
                                  </span>
                                </div>
                                <div className="text-[10px] text-text-dim mt-0.5">
                                  Scheduled: {arrivalTime} | Platform {stop.platformNumber}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs font-semibold">{stop.liveETA}</div>
                                {stop.liveDelay && stop.liveDelay > 0 ? (
                                  <div className="text-[9px] text-accent-amber font-semibold">
                                    +{stop.liveDelay} min delay
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-accent-green font-semibold">On time</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <span className="text-3xl mb-2">🚂</span>
              <h3 className="text-sm font-semibold text-text-primary">No Train Selected</h3>
              <p className="text-xs text-text-dim mt-1 max-w-[200px] leading-relaxed">
                Click a train marker on the map or select from the live list to view telemetry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
