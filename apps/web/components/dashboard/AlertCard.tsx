'use client'

import { useState } from 'react'
import { AgentFlag } from '@/lib/types'
import { SeverityBadge } from '@/components/ui/Badge'
import { flagsApi } from '@/lib/api'

const FLAG_TYPE_LABELS: Record<string, string> = {
  DELAY_DETECTED:    'Delay Detected',
  CASCADE_RISK:      'Cascade Risk',
  PLATFORM_CONFLICT: 'Platform Conflict',
  SEVERELY_DELAYED:  'Severely Delayed',
}

const FLAG_TYPE_ICONS: Record<string, string> = {
  DELAY_DETECTED:    '⏱',
  CASCADE_RISK:      '⚡',
  PLATFORM_CONFLICT: '⚠️',
  SEVERELY_DELAYED:  '🚨',
}

export function AlertCard({ flag, onResolve }: { flag: AgentFlag; onResolve?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolution, setResolution] = useState('')

  const severityBorder: Record<string, string> = {
    CRITICAL: 'border-accent-red/40',
    HIGH: 'border-amber-500/30',
    MEDIUM: 'border-blue-500/20',
    LOW: 'border-border',
  }

  async function handleResolve() {
    if (!resolution.trim()) return
    setResolving(true)
    try {
      await flagsApi.resolve(flag.id, resolution)
      setShowResolveModal(false)
      onResolve?.()
    } catch (err) {
      console.error('Failed to resolve flag')
    } finally {
      setResolving(false)
    }
  }

  const trainName = flag.trainRun?.train?.name || 'Unknown Train'
  const trainNum = flag.trainRun?.train?.number || ''

  return (
    <>
      <div
        className={`rs-card border ${severityBorder[flag.severity] || 'border-border'} ${
          flag.isResolved ? 'opacity-60' : ''
        } transition-all`}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">{FLAG_TYPE_ICONS[flag.type]}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{trainName}</span>
                  {trainNum && (
                    <span className="text-xs text-text-dim bg-bg-primary px-1.5 py-0.5 rounded">{trainNum}</span>
                  )}
                </div>
                <div className="text-xs text-text-dim mt-0.5">{FLAG_TYPE_LABELS[flag.type]}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <SeverityBadge severity={flag.severity} />
              {flag.isResolved && (
                <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">Resolved</span>
              )}
            </div>
          </div>

          {/* Reasoning preview */}
          <p className={`mt-3 text-sm text-text-muted leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {flag.reasoning}
          </p>

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 text-xs text-accent-red hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </div>

        {/* Expanded suggestion */}
        {expanded && (
          <div className="px-4 pb-3 border-t border-border/50 pt-3">
            <p className="text-xs text-text-dim uppercase font-semibold mb-1">Suggested Action</p>
            <p className="text-sm text-accent-amber">{flag.suggestion}</p>

            {flag.isResolved && flag.resolution && (
              <div className="mt-3 p-2 rounded bg-green-500/5 border border-green-500/10">
                <span className="text-[10px] text-green-400 uppercase font-bold block">Resolution Log</span>
                <span className="text-xs text-text-muted">{flag.resolution} (by {flag.resolvedBy || 'System'})</span>
              </div>
            )}

            {!flag.isResolved && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="bg-accent-red hover:bg-accent-red-dark text-white font-medium text-xs px-3 py-1.5 rounded-md transition-colors"
                >
                  Resolve Alert
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-secondary border border-border rounded-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text-primary">Resolve Operation Advisory</h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-text-muted hover:text-text-primary text-sm"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-text-muted">
              Record the operations response taken to resolve this AI advisory for <strong>{trainName} ({trainNum})</strong>.
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-dim uppercase mb-1.5">Action Taken</label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="e.g., Confirmed secondary platform availability at LKO, routed train 12401 to platform 3 to bypass schedule conflict."
                className="w-full min-h-[80px] bg-bg-primary border border-border rounded-lg p-2.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-red/50 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResolveModal(false)}
                className="px-3.5 py-1.5 border border-border rounded-lg text-xs hover:bg-bg-primary transition-colors text-text-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving || !resolution.trim()}
                className="px-3.5 py-1.5 bg-accent-red hover:bg-accent-red-dark text-white font-semibold rounded-lg text-xs transition-colors disabled:opacity-50"
              >
                {resolving ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
