'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { TrainGrid } from '@/components/dashboard/TrainGrid'
import { AlertCard } from '@/components/dashboard/AlertCard'
import { Spinner } from '@/components/ui/Spinner'
import { dashboardApi, trainsApi, flagsApi } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { TrainPosition, AgentFlag, DashboardStats } from '@/lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [trains, setTrains] = useState<TrainPosition[]>([])
  const [flags, setFlags] = useState<AgentFlag[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDashboardData() {
    try {
      const [statsRes, trainsRes, flagsRes] = await Promise.all([
        dashboardApi.getStats(),
        trainsApi.getAll(),
        flagsApi.getAll({ isResolved: false }),
      ])
      setStats(statsRes.data)
      setTrains(trainsRes.data)
      setFlags(flagsRes.data)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()

    const socket = getSocket()

    // Listen to real-time train updates
    socket.on('trains:positions', (data: TrainPosition[]) => {
      setTrains(data)
      // Refresh stats when train positions change
      dashboardApi.getStats().then((res) => setStats(res.data)).catch(console.error)
    })

    // Listen to new AI agent flags
    socket.on('agent:flag', (newFlag: AgentFlag) => {
      setFlags((prev) => {
        const exists = prev.findIndex((f) => f.id === newFlag.id)
        if (exists !== -1) {
          if (newFlag.isResolved) {
            // Remove resolved flag from active list
            return prev.filter((f) => f.id !== newFlag.id)
          }
          const copy = [...prev]
          copy[exists] = newFlag
          return copy
        }
        return newFlag.isResolved ? prev : [newFlag, ...prev]
      })

      // Refresh stats
      dashboardApi.getStats().then((res) => setStats(res.data)).catch(console.error)
    })

    return () => {
      socket.off('trains:positions')
      socket.off('agent:flag')
    }
  }, [])

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col pt-14 justify-center items-center">
        <Navbar />
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-2 font-semibold uppercase tracking-wider">
          Initializing Station Control Deck...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col pt-14">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 overflow-y-auto">
        {/* Dashboard Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Station Control Deck</h1>
            <p className="text-xs text-text-muted mt-0.5">
              Indian Railways Regional Operations Management & AI Advisory dispatch console.
            </p>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              loadDashboardData()
            }}
            className="self-start text-xs border border-border bg-bg-secondary hover:border-border-light hover:bg-bg-primary text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <span>🔄</span> Force Sync
          </button>
        </div>

        {/* Stats Strip */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">Active Trains</div>
              <div className="text-2xl font-black mt-1 text-text-primary">{stats.totalActive}</div>
            </div>
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">On Time</div>
              <div className="text-2xl font-black mt-1 text-accent-green">{stats.onTime}</div>
            </div>
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">Delayed</div>
              <div className="text-2xl font-black mt-1 text-accent-amber">{stats.delayed}</div>
            </div>
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">Severe Delays</div>
              <div className="text-2xl font-black mt-1 text-accent-red">{stats.severelyDelayed}</div>
            </div>
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">Critical Alarms</div>
              <div className="text-2xl font-black mt-1 text-accent-red animate-pulse">{stats.criticalFlags}</div>
            </div>
            <div className="rs-card p-4 text-center">
              <div className="text-[10px] text-text-dim uppercase font-semibold">Resolved (Today)</div>
              <div className="text-2xl font-black mt-1 text-green-400">{stats.resolvedToday}</div>
            </div>
          </div>
        )}

        {/* Main Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Active Train List (Left Columns - Span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-border rounded-xl bg-bg-secondary/20 p-4">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-1.5">
                <span>🚂</span> Network Dispatch Grid
              </h3>
              <TrainGrid trains={trains} onDelayInjected={loadDashboardData} />
            </div>
          </div>

          {/* AI Advisories (Right Column) */}
          <div className="space-y-4">
            <div className="border border-border rounded-xl bg-bg-secondary/20 p-4">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-1.5">
                <span>🧠</span> Live AI Operations Advisory ({flags.length})
              </h3>

              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                {flags.length === 0 ? (
                  <div className="text-center py-12 text-text-dim text-xs">
                    <span className="text-2xl block mb-2">✅</span>
                    No active operations alerts. All dispatch streams running optimally.
                  </div>
                ) : (
                  flags.map((flag) => (
                    <AlertCard key={flag.id} flag={flag} onResolve={loadDashboardData} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
