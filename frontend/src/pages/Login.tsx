import { motion } from 'framer-motion'
import { Lock, User, X } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../constants'
import {
  addRememberedAccount,
  getRememberedAccounts,
  removeRememberedAccount,
} from '../services/authService'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberAccount, setRememberAccount] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberedAccounts, setRememberedAccounts] = useState<string[]>(getRememberedAccounts())
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTE_PATHS.DASHBOARD

  useEffect(() => {
    const list = getRememberedAccounts()
    if (list.length > 0 && !username) setUsername(list[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectAccount = (name: string) => {
    setUsername(name)
  }

  const handleRemoveAccount = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    removeRememberedAccount(name)
    setRememberedAccounts(getRememberedAccounts())
    if (username === name) setUsername('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ username, password })
      if (rememberAccount) {
        addRememberedAccount(username)
        setRememberedAccounts(getRememberedAccounts())
      }
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败，请检查用户名和密码'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8"
      >
        <h1 className="text-xl font-semibold text-white mb-6">Apex Vision Pro</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">用户名</label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                placeholder="请输入用户名"
                required
              />
            </div>
            {rememberedAccounts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {rememberedAccounts.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/80"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectAccount(name)}
                      className="hover:text-white"
                    >
                      {name}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAccount(e, name)}
                      className="p-0.5 rounded hover:bg-white/20 text-white/50"
                      aria-label={`移除 ${name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">密码</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                placeholder="请输入密码"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberAccount}
              onChange={(e) => setRememberAccount(e.target.checked)}
              className="rounded border-white/30 bg-white/5 text-cyan-500 focus:ring-cyan-500/50"
            />
            <span className="text-xs text-white/60">记住账号（仅保存用户名，不保存密码）</span>
          </label>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-white/50">
          还没有账号？{' '}
          <Link to={ROUTE_PATHS.REGISTER} className="text-cyan-400 hover:underline">
            立即注册
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
