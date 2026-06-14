'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PASSENGER' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.register(form.name, form.email, form.password, form.role)
      localStorage.setItem('railsense_token', res.data.token)
      localStorage.setItem('railsense_user', JSON.stringify(res.data.user))
      router.push(res.data.user.role === 'STATION_MASTER' ? '/dashboard' : '/track')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 md:top-8 md:left-8 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-text-primary transition-colors bg-bg-secondary/50 hover:bg-bg-secondary px-3.5 py-1.5 rounded-lg border border-border/50 hover:border-border-light backdrop-blur-md group"
      >
        <svg
          className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back to Home</span>
      </Link>
      <div className="w-full max-w-md">
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
          <p className="mt-2 text-text-muted text-sm">Create your account</p>
        </div>

        <div className="rs-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-3 text-accent-red text-sm">{error}</div>
            )}
            {[['name','text','Full Name','Rahul Sharma'],['email','email','Email','you@example.com'],['password','password','Password','••••••••']].map(([field, type, label, placeholder]) => (
              <div key={field}>
                <label className="block text-sm font-medium text-text-muted mb-1.5">{label}</label>
                <input
                  type={type}
                  value={(form as any)[field]}
                  onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder}
                  required
                  className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent-red/50 transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-red/50 transition-colors"
              >
                <option value="PASSENGER">Passenger</option>
                <option value="STATION_MASTER">Station Master</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent-red hover:bg-accent-red-dark text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
        <p className="text-center mt-4 text-text-muted text-sm">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-red hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
