'use client'

import { useState } from 'react'
import { TrainPosition } from '@/lib/types'
import { StatusBadge } from '@/components/ui/Badge'
import { trainsApi } from '@/lib/api'

interface TrainGridProps {
  trains: TrainPosition[]
  onDelayInjected?: () => void
}

export function TrainGrid({ trains, onDelayInjected }: TrainGridProps) {
  const [selectedTrain, setSelectedTrain] = useState<TrainPosition | null>(null)
  const [delayMins, setDelayMins] = useState(20)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')

  async function handleInjectDelay() {
    if (!selectedTrain) return
    setSubmitting(true)
    try {
      await trainsApi.addDelay(selectedTrain.trainId, delayMins)
      setSelectedTrain(null)
      onDelayInjected?.()
    } catch (err) {
      console.error('Failed to inject delay:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTrains = trains.filter((t) => {
    if (filter === 'ALL') return true
    return t.status === filter
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {['ALL', 'ON_TIME', 'DELAYED', 'SEVERELY_DELAYED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === f
                ? 'bg-accent-red/10 text-accent-red border-accent-red/30 font-semibold'
                : 'text-text-muted border-border hover:text-text-primary hover:bg-bg-secondary'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTrains.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-text-dim text-sm bg-bg-secondary/20 rounded-xl border border-border/50">
            No trains match the selected filter.
          </div>
        ) : (
          filteredTrains.map((train) => (
            <div key={train.trainRunId} className="rs-card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-text-primary truncate">{train.trainName}</h4>
                    <span className="text-xs text-text-dim mt-0.5 block">No. {train.trainNumber}</span>
                  </div>
                  <StatusBadge status={train.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-text-muted">
                  <div>
                    <span className="text-text-dim">Speed:</span> {Math.round(train.speed)} km/h
                  </div>
                  <div>
                    <span className="text-text-dim">Delay:</span>{' '}
                    <span className={train.delayMinutes > 0 ? 'text-accent-amber' : 'text-accent-green'}>
                      {train.delayMinutes > 0 ? `+${train.delayMinutes} min` : 'On time'}
                    </span>
                  </div>
                  <div className="col-span-2 truncate">
                    <span className="text-text-dim">Sector:</span> {train.lastStation} ➔ {train.nextStation || 'Terminus'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 flex justify-end">
                <button
                  onClick={() => setSelectedTrain(train)}
                  className="bg-bg-primary hover:bg-bg-secondary border border-border hover:border-border-light text-text-muted hover:text-text-primary font-medium text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>⚠️</span> Inject Delay
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Delay Modal */}
      {selectedTrain && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border rounded-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Manual Delay Injection</h3>
              <button
                onClick={() => setSelectedTrain(null)}
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Manually insert minutes of delay for <strong>{selectedTrain.trainName}</strong> to simulate network dispatch disruptions.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-dim uppercase">Delay Duration (Minutes)</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 20, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDelayMins(m)}
                    className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      delayMins === m
                        ? 'bg-accent-amber/20 text-accent-amber border-accent-amber/55'
                        : 'bg-bg-primary text-text-muted border-border hover:border-border-light'
                    }`}
                  >
                    +{m}m
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                max={300}
                value={delayMins}
                onChange={(e) => setDelayMins(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-red/50 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedTrain(null)}
                className="px-3.5 py-1.5 border border-border rounded-lg text-xs hover:bg-bg-primary transition-colors text-text-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleInjectDelay}
                disabled={submitting}
                className="px-3.5 py-1.5 bg-accent-amber hover:bg-amber-600 text-bg-primary font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                {submitting ? 'Injecting...' : 'Inject Delay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
