'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FullPageLoader } from '@/components/ui/Spinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('railsense_token')
    const storedUser = localStorage.getItem('railsense_user')

    if (!token || !storedUser) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(storedUser)
      if (user.role !== 'STATION_MASTER') {
        router.push('/track')
        return
      }
      setAuthorized(true)
    } catch (err) {
      router.push('/login')
    }
  }, [router])

  if (!authorized) {
    return <FullPageLoader message="Verifying Operations Credentials..." />
  }

  return <>{children}</>
}
