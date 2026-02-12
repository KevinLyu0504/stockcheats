import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants'
import {
  clearAuth,
  getStoredToken,
  getStoredUser,
  login as apiLogin,
  register as apiRegister,
  setAuth,
} from '../services/authService'
import type { LoginParams, RegisterParams } from '../services/authService'
import type { User } from '../types/user'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (params: LoginParams) => Promise<void>
  register: (params: RegisterParams) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** 开发时若后端暂无鉴权 API，可设置 VITE_AUTH_DISABLED=true 跳过登录 */
const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<AuthState>({
    user: AUTH_DISABLED ? { id: 'dev', username: 'dev' } : null,
    token: AUTH_DISABLED ? 'dev-bypass' : null,
    loading: !AUTH_DISABLED,
  })

  const logout = useCallback(() => {
    clearAuth()
    setState({ token: null, user: null, loading: false })
  }, [])

  useEffect(() => {
    if (AUTH_DISABLED) {
      setState({ user: { id: 'dev', username: 'dev' }, token: 'dev-bypass', loading: false })
      return
    }
    const token = getStoredToken()
    const user = getStoredUser()
    setState({ token, user, loading: false })
  }, [])

  /** 监听 api client 派发的 auth:expired 事件，通过 React Router 跳转 */
  useEffect(() => {
    const handler = () => {
      logout()
      navigate(ROUTE_PATHS.LOGIN, { replace: true })
    }
    window.addEventListener('auth:expired', handler)
    return () => window.removeEventListener('auth:expired', handler)
  }, [logout, navigate])

  const login = useCallback(async (params: LoginParams) => {
    const res = await apiLogin(params)
    const user = res.user ?? { id: params.username, username: params.username }
    setAuth(res.access_token, user)
    setState({ token: res.access_token, user, loading: false })
  }, [])

  const register = useCallback(async (params: RegisterParams) => {
    const res = await apiRegister(params)
    const user = res.user ?? { id: params.username, username: params.username }
    setAuth(res.access_token, user)
    setState({ token: res.access_token, user, loading: false })
  }, [])

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    isAuthenticated: AUTH_DISABLED || !!state.token,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
