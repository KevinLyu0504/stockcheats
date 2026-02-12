import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#0A0A0A] flex items-center justify-center text-white/60">
        加载中...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
