'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      localStorage.setItem('railsense_token', res.data.token)
      localStorage.setItem('railsense_user', JSON.stringify(res.data.user))
      router.push(res.data.user.role === 'STATION_MASTER' ? '/dashboard' : '/track')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/track" className="inline-flex items-center gap-2 text-2xl font-bold">
            <div className="w-10 h-10 bg-accent-red rounded-xl flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 12h18M3 8h18M3 16h18"/>
                <circle cx="8" cy="20" r="1.5" fill="white"/>
                <circle cx="16" cy="20" r="1.5" fill="white"/>
              </svg>
            </div>
            Rail<span className="text-accent-red">Sense</span>
          </Link>
          <p className="mt-2 text-text-muted text-sm">Sign in to Operations Dashboard</p>
        </div>

        <div className="rs-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 text-accent-red text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@railsense.com"
                required
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-red/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-red/50 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-text-dim text-center mb-3">Demo credentials:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setEmail('admin@railsense.com'); setPassword('password123') }}
                className="text-xs p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10 transition-colors text-left"
              >
                <div className="font-semibold">Station Master</div>
                <div className="text-amber-400/60">admin@railsense.com</div>
              </button>
              <button
                onClick={() => { setEmail('passenger@railsense.com'); setPassword('password123') }}
                className="text-xs p-2 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400 hover:bg-green-500/10 transition-colors text-left"
              >
                <div className="font-semibold">Passenger</div>
                <div className="text-green-400/60">passenger@railsense.com</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center mt-4 text-text-muted text-sm">
          No account?{' '}
          <Link href="/register" className="text-accent-red hover:underline">Register</Link>
        </p>
      </div>
    </div>
  )
}
