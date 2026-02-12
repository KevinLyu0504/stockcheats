import { BookOpen, FileText, Heart, LayoutGrid, LogOut } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTE_PATHS } from '../constants'
import { useAuth } from '../contexts/AuthContext'

export type View = 'watchlist' | 'market' | 'report' | 'research'

interface SidebarProps {
  currentView: View
  onViewChange: (view: View) => void
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initial = user?.username?.[0]?.toUpperCase() ?? '?'

  const btn = (view: View, Icon: React.ComponentType<{ size?: number; fill?: string; strokeWidth?: number }>, title: string, fill?: boolean) => (
    <button
      type="button"
      onClick={() => onViewChange(view)}
      className={`w-10 h-10 flex items-center justify-center rounded-md transition-colors ${
        currentView === view
          ? 'bg-white/20 text-white'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5'
      }`}
      title={title}
    >
      <Icon
        size={20}
        fill={fill && currentView === view ? 'currentColor' : 'none'}
        strokeWidth={1.5}
      />
    </button>
  )

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuOpen])

  const handleLogout = () => {
    setMenuOpen(false)
    logout()
    navigate(ROUTE_PATHS.LOGIN)
  }

  return (
    <aside className="w-16 border-r border-white/10 flex flex-col items-center py-4 gap-2 bg-[#111111] shrink-0">
      <div className="relative mb-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-sm font-medium hover:bg-cyan-500/30 transition-colors"
          title={user?.username ?? '账户'}
        >
          {initial}
        </button>
        {menuOpen && (
          <div className="absolute left-full top-0 ml-2 mt-0 rounded-lg bg-[#1a1a1a] border border-white/10 py-1 min-w-[100px] shadow-xl z-50">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 flex items-center gap-2"
            >
              <LogOut size={14} />
              登出
            </button>
          </div>
        )}
      </div>
      {btn('watchlist', Heart, '自选', true)}
      {btn('market', LayoutGrid, '市场')}
      {btn('report', FileText, 'AI 分析报告')}
      {btn('research', BookOpen, '研报中心')}
    </aside>
  )
}
