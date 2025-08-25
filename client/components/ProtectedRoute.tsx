'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login?returnUrl=' + encodeURIComponent(window.location.pathname))
      }
    }

    checkAuth()
  }, [router])

  return <>{children}</>
}