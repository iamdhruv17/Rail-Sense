'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/track', label: 'Live Map' },
  { href: '/track/pnr', label: 'PNR Lookup' },
  { href: '/dashboard', label: 'Dashboard', protected: true },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('railsense_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  function logout() {
    localStorage.removeItem('railsense_token')
    localStorage.removeItem('railsense_user')
    setUser(null)
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="w-7 h-7 bg-accent-red rounded-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 12h18M3 8h18M3 16h18"/>
              <circle cx="8" cy="20" r="1.5" fill="white"/>
              <circle cx="16" cy="20" r="1.5" fill="white"/>
            </svg>
          </div>
          <span>Rail<span className="text-accent-red">Sense</span></span>
          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-red/10 border border-accent-red/30 text-accent-red">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-red animate-pulse"/>
            LIVE
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            if (link.protected && (!user || user.role !== 'STATION_MASTER')) return null
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:block text-xs text-text-muted">
                {user.name}
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${
                  user.role === 'STATION_MASTER' ? 'text-accent-amber' : 'text-accent-green'
                }`}>
                  {user.role === 'STATION_MASTER' ? 'SM' : 'PAX'}
                </span>
              </span>
              <button
                onClick={logout}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs px-3 py-1.5 rounded-lg bg-accent-red text-white font-semibold hover:bg-accent-red-dark transition-colors"
            >
              Login
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 rounded-lg border border-border text-text-muted"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-bg-secondary px-4 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            if (link.protected && (!user || user.role !== 'STATION_MASTER')) return null
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                    : 'text-text-muted hover:text-text-primary hover:bg-bg-primary'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
