import { Heart, Loader2 } from 'lucide-react'
import React, { memo } from 'react'
import type { MarketData } from '../types/market'

interface StockRowProps {
  symbol: string
  price: number | undefined
  isFavorite: boolean
  isToggling: boolean
  onToggleFavorite: (symbol: string) => void
  onSelect: (symbol: string) => void
}

const StockRow = memo<StockRowProps>(function StockRow({
  symbol,
  price,
  isFavorite,
  isToggling,
  onToggleFavorite,
  onSelect,
}) {
  const p = price ?? 0
  const displayPrice = p > 0 ? p.toFixed(2) : '—'
  const changeColor = p > 0 ? 'text-[#26a69a]' : p < 0 ? 'text-[#ef5350]' : 'text-white/60'

  return (
    <div
      role="row"
      className="flex items-center gap-4 px-4 py-2.5 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
      onClick={() => onSelect(symbol)}
    >
      <span className="font-mono text-sm text-white/90 w-20">{symbol}</span>
      <span className={`font-mono text-sm flex-1 ${changeColor}`}>{displayPrice}</span>
      <button
        type="button"
        disabled={isToggling}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(symbol)
        }}
        className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-white/60 hover:text-red-400 disabled:opacity-50"
      >
        {isToggling ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Heart
            size={16}
            fill={isFavorite ? '#ef5350' : 'none'}
            stroke={isFavorite ? '#ef5350' : 'currentColor'}
            strokeWidth={1.5}
          />
        )}
      </button>
    </div>
  )
})

interface StockListProps {
  symbols: string[]
  marketData: MarketData
  favorites: string[]
  onToggleFavorite: (symbol: string) => void
  onSelect: (symbol: string) => void
  togglingSymbol?: string | null
}

export const StockList: React.FC<StockListProps> = ({
  symbols,
  marketData,
  favorites,
  onToggleFavorite,
  onSelect,
  togglingSymbol,
}) => {
  if (!symbols.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/40 text-sm text-center px-4">
        等待 WebSocket 推送数据...
        <br />
        <span className="text-xs">或切换到「市场」查看全部</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      {symbols.map((symbol) => (
        <StockRow
          key={symbol}
          symbol={symbol}
          price={marketData[symbol]?.price}
          isFavorite={favorites.includes(symbol)}
          isToggling={togglingSymbol === symbol}
          onToggleFavorite={onToggleFavorite}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
