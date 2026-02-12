import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Lock, Mail, User } from 'lucide-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../constants'

export function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 4) {
      setError('密码至少 4 个字符')
      return
    }
    setLoading(true)
    try {
      await register({ username, password, email: email || undefined })
      setShowWelcome(true)
      setTimeout(() => {
        navigate(ROUTE_PATHS.DASHBOARD, { replace: true })
      }, 2500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '注册失败，请稍后重试'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="mb-4"
            >
              <CheckCircle size={48} className="text-cyan-400 mx-auto" />
            </motion.div>
            <h1 className="text-xl font-semibold text-white mb-2">
              欢迎加入，{username}！
            </h1>
            <p className="text-sm text-white/60 mb-4">
              你的账号已创建成功。即将进入 Apex Vision Pro 仪表盘...
            </p>
            <div className="space-y-2 text-xs text-white/50 text-left bg-white/5 rounded-lg p-4">
              <p className="text-white/70 font-medium mb-2">快速上手：</p>
              <p>1. 在「市场」页面浏览实时行情</p>
              <p>2. 点击心形图标将股票加入自选</p>
              <p>3. 在「AI 分析报告」中生成研报</p>
              <p>4. 在「研报中心」查看和管理研报</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-8"
          >
            <h1 className="text-xl font-semibold text-white mb-6">注册 Apex Vision Pro</h1>
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
                    minLength={2}
                  />
                </div>
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
                    placeholder="请输入密码（至少 4 位）"
                    required
                    minLength={4}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">邮箱（选填）</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>
            <p className="mt-4 text-center text-xs text-white/50">
              已有账号？{' '}
              <Link to={ROUTE_PATHS.LOGIN} className="text-cyan-400 hover:underline">
                立即登录
              </Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
