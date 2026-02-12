import { ChevronLeft } from 'lucide-react'
import React, { useState } from 'react'
import { ApexChart } from './ApexChart'
import { WindowControls } from './WindowControls'
import type { MarketSnapshot } from '../types/market'

type Timeframe = '1D' | '5D' | '1M'

interface DetailViewProps {
  symbol: string
  liveSnapshot?: MarketSnapshot | null
  onBack: () => void
}

export const DetailView: React.FC<DetailViewProps> = ({ symbol, liveSnapshot, onBack }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>('1D')
  const [price, setPrice] = useState<number | null>(null)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4 flex-1" data-tauri-drag-region>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
            title="返回"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-mono text-sm text-white/90">{symbol}</span>
          <span className="text-sm text-white/60">
            {price != null ? price.toFixed(2) : '—'}
          </span>
          <div className="flex items-center gap-1">
            {(['1D', '5D', '1M'] as const).map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  timeframe === tf
                    ? 'bg-white/20 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
        <WindowControls />
      </header>
      <section className="flex-1 min-h-0 flex flex-col">
        <ApexChart
          symbol={symbol}
          timeframe={timeframe}
          liveSnapshot={liveSnapshot}
          onPriceChange={setPrice}
        />
      </section>
    </div>
  )
}
