import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { DetailView } from '../components/DetailView'
import { RealtimePanel } from '../components/RealtimePanel'
import { ReportView } from '../components/ReportView'
import { ResearchHub } from '../components/ResearchHub'
import { Sidebar, type View } from '../components/Sidebar'
import { StockList } from '../components/StockList'
import { WindowControls } from '../components/WindowControls'
import { useToast } from '../contexts/ToastContext'
import { useWebSocket } from '../hooks/useWebSocket'
import type { WebSocketStatus } from '../hooks/useWebSocket'
import {
  addToWatchlist,
  fetchWatchlist,
  removeFromWatchlist,
} from '../services/watchlistService'

function WsStatusBar({ status, retryCount }: { status: WebSocketStatus; retryCount: number }) {
  if (status === 'connected') return null
  const label =
    status === 'connecting'
      ? '正在连接行情服务...'
      : status === 'reconnecting'
        ? `行情连接已断开，正在重连（第 ${retryCount} 次）...`
        : status === 'error'
          ? '行情服务连接失败'
          : '行情连接已关闭'
  const bg =
    status === 'reconnecting' || status === 'connecting'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30'
  return (
    <div className={`px-4 py-1.5 text-xs flex items-center gap-2 border-b ${bg}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
      </span>
      {label}
    </div>
  )
}

function DashboardContent() {
  const { marketData, tickers, status: wsStatus, retryCount } = useWebSocket()
  const { showToast } = useToast()
  const [favorites, setFavorites] = useState<string[]>([])
  const [currentView, setCurrentView] = useState<View | 'detail'>('market')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [togglingSymbol, setTogglingSymbol] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true)
    try {
      const list = await fetchWatchlist()
      setFavorites(list)
    } catch {
      setFavorites([])
    } finally {
      setWatchlistLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWatchlist()
  }, [loadWatchlist])

  const handleToggleFavorite = useCallback(
    async (symbol: string) => {
      if (togglingSymbol) return
      const isInList = favorites.includes(symbol)
      setTogglingSymbol(symbol)
      try {
        if (isInList) {
          await removeFromWatchlist(symbol)
          showToast('success', `已移除自选 ${symbol}`)
        } else {
          await addToWatchlist(symbol)
          showToast('success', `已添加自选 ${symbol}`)
        }
        await loadWatchlist()
      } catch {
        showToast('error', `操作失败，请稍后重试`)
      } finally {
        setTogglingSymbol(null)
      }
    },
    [favorites, loadWatchlist, togglingSymbol, showToast]
  )

  const handleSelectSymbol = useCallback((symbol: string) => {
    setSelectedSymbol(symbol)
    setCurrentView('detail')
  }, [])

  const handleBack = useCallback(() => {
    setCurrentView('market')
    setSelectedSymbol(null)
  }, [])

  const handleViewChange = useCallback((view: View) => {
    setCurrentView(view)
    setSelectedSymbol(null)
    setSearchQuery('')
  }, [])

  const baseSymbols =
    currentView === 'watchlist'
      ? tickers.filter((s) => favorites.includes(s))
      : tickers

  const listSymbols = useMemo(() => {
    if (!searchQuery.trim()) return baseSymbols
    const q = searchQuery.trim().toUpperCase()
    return baseSymbols.filter((s) => s.toUpperCase().includes(q))
  }, [baseSymbols, searchQuery])

  const showMarketList =
    currentView !== 'report' && currentView !== 'research' && !(currentView === 'detail' && selectedSymbol)

  return (
    <div className="w-screen h-screen bg-[#0A0A0A] text-white flex overflow-hidden select-none">
      <Sidebar
        currentView={currentView === 'detail' ? 'market' : (currentView as View)}
        onViewChange={handleViewChange}
      />

      {currentView === 'report' ? (
        <main className="flex-1 flex flex-col min-w-0">
          <ReportView />
        </main>
      ) : currentView === 'research' ? (
        <main className="flex-1 flex flex-col min-w-0">
          <ResearchHub />
        </main>
      ) : currentView === 'detail' && selectedSymbol ? (
        <main className="flex-1 flex flex-col min-w-0">
          <WsStatusBar status={wsStatus} retryCount={retryCount} />
          <DetailView
            symbol={selectedSymbol}
            liveSnapshot={marketData[selectedSymbol]}
            onBack={handleBack}
          />
        </main>
      ) : (
        <main className="flex-1 flex flex-col min-w-0">
          <WsStatusBar status={wsStatus} retryCount={retryCount} />
          <header
            className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl shrink-0"
            data-tauri-drag-region
          >
            <span className="text-sm text-white/60">
              {currentView === 'watchlist' ? '自选' : '市场'} · {listSymbols.length} 只
              {watchlistLoading && currentView === 'watchlist' && ' · 加载中...'}
            </span>
            <WindowControls />
          </header>
          {/* 搜索框 */}
          <div className="px-4 py-2 border-b border-white/5 bg-black/20">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                placeholder="搜索股票代码..."
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10 text-white/40"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <StockList
            symbols={listSymbols}
            marketData={marketData}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelect={handleSelectSymbol}
            togglingSymbol={togglingSymbol}
          />
        </main>
      )}

      {showMarketList && (
        <aside className="w-80 border-l border-white/10 bg-black/40 backdrop-blur-xl flex flex-col shrink-0">
          <RealtimePanel />
        </aside>
      )}
    </div>
  )
}

export function Dashboard() {
  return <DashboardContent />
}
