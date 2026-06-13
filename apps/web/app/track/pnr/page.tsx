'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { StatusBadge, SeverityBadge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { pnrApi } from '@/lib/api'
import { PNRData } from '@/lib/types'

export default function PnrPage() {
  const [pnrNumber, setPnrNumber] = useState('')
  const [pnrData, setPnrData] = useState<PNRData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!pnrNumber.trim()) return
    setError('')
    setLoading(true)
    setSubscribed(false)
    try {
      const res = await pnrApi.lookup(pnrNumber.trim())
      setPnrData(res.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'PNR not found. Try PNR: 4812657390')
      setPnrData(null)
    } finally {
      setLoading(false)
    }
  }

  const stops = pnrData?.train?.route?.stops || []
  const activeRun = pnrData?.train?.currentRun

  // Find boarding and destination stops index to highlight travel segment
  const boardingStopIdx = stops.findIndex((s) => s.station.code === pnrData?.boardingStationCode)
  const destStopIdx = stops.findIndex((s) => s.station.code === pnrData?.destinationCode)

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col pt-14">
      <Navbar />

      <div className="flex-1 max-w-4xl w-full mx-auto p-4 md:py-8 space-y-6">
        {/* Header and search */}
        <div className="text-center max-w-xl mx-auto space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Passenger PNR Telemetry</h1>
          <p className="text-sm text-text-muted">
            Enter your 10-digit Indian Railways PNR number to check your seat allocation, live train telemetry, and smart ETAs.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2 pt-2">
            <input
              type="text"
              maxLength={10}
              value={pnrNumber}
              onChange={(e) => setPnrNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 4812657390"
              className="flex-1 bg-bg-secondary border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-red/50 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-accent-red hover:bg-accent-red-dark text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="text-xs text-text-dim">
            Demo PNRs: <code className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-muted">4812657390</code>,{' '}
            <code className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-muted">4812657391</code>,{' '}
            <code className="bg-bg-secondary px-1.5 py-0.5 rounded text-text-muted">4812657392</code>
          </div>
        </div>

        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 text-center text-accent-red text-sm max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* PNR Details Card */}
        {pnrData && (
          <div className="space-y-6">
            <div className="rs-card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Passenger Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider">Passenger Details</h3>
                <div className="space-y-2">
                  <div className="text-xs text-text-muted">Passenger Name</div>
                  <div className="text-sm font-bold">{pnrData.passengerName}</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-text-dim uppercase">Coach</div>
                    <div className="text-sm font-bold mt-0.5">{pnrData.coach}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-dim uppercase">Seat</div>
                    <div className="text-sm font-bold mt-0.5">{pnrData.seat}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-text-dim uppercase">Class</div>
                    <div className="text-sm font-bold mt-0.5">{pnrData.class}</div>
                  </div>
                </div>
              </div>

              {/* Journey details */}
              <div className="space-y-4 md:border-l md:border-r md:border-border md:px-6">
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider">Journey Details</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-text-dim uppercase">Boarding Station</div>
                    <div className="text-sm font-bold mt-0.5">{pnrData.boardingStationCode}</div>
                  </div>
                  <div className="text-text-dim text-xs">➔</div>
                  <div className="text-right">
                    <div className="text-[10px] text-text-dim uppercase">Destination</div>
                    <div className="text-sm font-bold mt-0.5">{pnrData.destinationCode}</div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setSubscribed(!subscribed)}
                    className={`w-full py-2 px-3 rounded-lg border text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      subscribed
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-bg-primary hover:bg-bg-secondary text-text-muted border-border hover:border-border-light'
                    }`}
                  >
                    <span>🔔</span> {subscribed ? 'Subscribed to Delay Alerts' : 'Notify me of Delay Alerts'}
                  </button>
                </div>
              </div>

              {/* Live Train Summary */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider">Live Train Telemetry</h3>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold">{pnrData.train.name}</div>
                      <div className="text-xs text-text-dim mt-0.5">No. {pnrData.train.number}</div>
                    </div>
                    {activeRun && <StatusBadge status={activeRun.status} />}
                  </div>

                  {activeRun && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-text-dim">Speed:</span> {Math.round(activeRun.currentSpeed)} km/h
                      </div>
                      <div className="text-right">
                        <span className="text-text-dim">Delay:</span>{' '}
                        <span className={activeRun.delayMinutes > 0 ? 'text-accent-amber' : 'text-accent-green'}>
                          {activeRun.delayMinutes > 0 ? `+${activeRun.delayMinutes} min` : 'On time'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Flags block if train has unresolved operations flags */}
            {activeRun?.AgentFlags && activeRun.AgentFlags.length > 0 && (
              <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-bold text-accent-red uppercase tracking-wider flex items-center gap-1.5">
                  <span>🚨</span> Smart Operations Advisory ({activeRun.AgentFlags.length})
                </h3>
                <div className="space-y-3">
                  {activeRun.AgentFlags.map((flag) => (
                    <div key={flag.id} className="text-xs leading-relaxed space-y-1">
                      <div className="flex items-center justify-between font-bold text-text-primary">
                        <span>{flag.type.replace('_', ' ')}</span>
                        <SeverityBadge severity={flag.severity} />
                      </div>
                      <p className="text-text-muted">{flag.reasoning}</p>
                      <p className="text-accent-amber font-semibold">💡 Impact/Recommendation: {flag.suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Travel Timeline visualization */}
            {stops.length > 0 && (
              <div className="rs-card p-6">
                <h3 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-6">Route & Travel Status</h3>

                <div className="relative border-l border-border ml-3 pl-5 space-y-6">
                  {stops.map((stop, index) => {
                    const isPassed = stop.stopStatus === 'PASSED'
                    const isCurrent = stop.stopStatus === 'CURRENT'
                    const isBoarding = index === boardingStopIdx
                    const isDest = index === destStopIdx
                    const isBetween = index >= boardingStopIdx && index <= destStopIdx

                    let borderStyles = 'bg-bg-primary border-border'
                    if (isCurrent) borderStyles = 'bg-accent-red border-accent-red shadow-[0_0_8px_#E8213B]'
                    else if (isPassed) borderStyles = 'bg-bg-primary border-text-muted'

                    return (
                      <div
                        key={stop.id}
                        className={`relative transition-opacity ${isBetween ? 'opacity-100' : 'opacity-50'}`}
                      >
                        {/* Bullet Circle */}
                        <span
                          className={`absolute -left-[26px] top-1.5 w-3 h-3 rounded-full border-2 transition-colors ${borderStyles}`}
                        />

                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className={`text-xs font-bold flex items-center gap-1.5 ${isCurrent ? 'text-accent-red' : ''}`}>
                              {stop.station.name}
                              <span className="text-[9px] font-normal text-text-dim bg-bg-primary/50 border border-border px-1 rounded">
                                {stop.station.code}
                              </span>

                              {isBoarding && (
                                <span className="text-[10px] font-semibold text-accent-green bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded">
                                  Your Boarding Station
                                </span>
                              )}
                              {isDest && (
                                <span className="text-[10px] font-semibold text-accent-red bg-accent-red/10 border border-accent-red/20 px-1.5 py-0.5 rounded">
                                  Your Destination
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-text-dim mt-0.5">
                              Scheduled Arrival: {stop.scheduledArrival || stop.scheduledDeparture || '--:--'} | Platform{' '}
                              {stop.platformNumber}
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}
