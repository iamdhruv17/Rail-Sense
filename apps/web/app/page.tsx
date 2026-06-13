'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LandingPage from '@/components/LandingPage'
import { Spinner } from '@/components/ui/Spinner'

export default function HomePage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('railsense_token')
    const userStr = localStorage.getItem('railsense_user')
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.role === 'STATION_MASTER') {
          router.replace('/dashboard')
        } else {
          router.replace('/track')
        }
        return
      } catch (err) {
        console.error('Failed to parse user session:', err)
      }
    }
    setCheckingAuth(false)
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col justify-center items-center">
        <Spinner size="lg" />
        <p className="text-xs text-text-muted mt-2 font-semibold uppercase tracking-wider">
          Connecting to RailSense network...
        </p>
      </div>
    )
  }

  return <LandingPage />
}

