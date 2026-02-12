import { createPortal } from 'react-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { FileText } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { useToast } from '../contexts/ToastContext'
import { DEFAULT_STOCKS } from '../data/defaultStocks'
import { ControlPanel } from './ControlPanel'
import { MAX_RANGE_DAYS, getRangeDays, triggerReportGeneration, validateReportParams } from '../services/reportService'
import { dateRangeToISO } from './DateRangeSelector'
import { WindowControls } from './WindowControls'

const spring = { type: 'spring' as const, stiffness: 400, damping: 30 }

interface StockTagProps {
  symbol: string
  onDragEnd?: (symbol: string, x: number, y: number) => void
  onDrag?: (x: number, y: number) => void
  onDragStart?: (symbol: string, x: number, y: number) => void
  onRemove?: (symbol: string) => void
  draggable?: boolean
  /** 拖拽中时隐藏原 tag（由拖拽预览层显示），避免被 overflow 裁剪 */
  isDragging?: boolean
}

const StockTag: React.FC<StockTagProps> = React.memo(({
  symbol,
  onDragEnd,
  onDrag,
  onDragStart,
  onRemove,
  draggable = true,
  isDragging = false,
}) => {
  return (
    <motion.div
      layout
      layoutId={`tag-${symbol}`}
      drag={draggable}
      dragElastic={0.1}
      dragMomentum={false}
      onDrag={draggable ? (_e, info: PanInfo) => onDrag?.(info.point.x, info.point.y) : undefined}
      onDragStart={draggable ? (_e, info: PanInfo) => onDragStart?.(symbol, info.point.x, info.point.y) : undefined}
      onDragEnd={draggable ? (_e, info: PanInfo) => onDragEnd?.(symbol, info.point.x, info.point.y) : undefined}
      className={`
        relative inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-mono font-medium
        select-none z-[100]
        bg-white/10 text-white/90 border border-white/20
        hover:bg-white/15 hover:border-white/30 transition-colors duration-200
        ${draggable ? 'cursor-grab active:cursor-grabbing px-3 py-1.5' : 'pl-3 pr-8 py-2'}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: draggable ? 0.98 : 1 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: isDragging ? 0 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    >
      <span>{symbol}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(symbol) }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
            flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20
            text-sm leading-none transition-colors"
          aria-label={`移除 ${symbol}`}
        >
          ×
        </button>
      )}
    </motion.div>
  )
})

export const ReportView: React.FC = () => {
  const { showToast } = useToast()
  const [availableStocks, setAvailableStocks] = useState<string[]>(DEFAULT_STOCKS)
  const [selectedStocks, setSelectedStocks] = useState<string[]>([])
  const [isOverDropZone, setIsOverDropZone] = useState(false)
  const [macroOn, setMacroOn] = useState(false)
  const [microOn, setMicroOn] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [draggingSymbol, setDraggingSymbol] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragPreviewRef = useRef<HTMLDivElement>(null)
  const isOverDropZoneRef = useRef(false)

  const dropZoneLeftPercent = 0.72

  const handleDragEnd = useCallback(
    (symbol: string, clientX: number, _clientY: number) => {
      setDraggingSymbol(null)
      isOverDropZoneRef.current = false
      setIsOverDropZone(false)
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const relX = (clientX - rect.left) / rect.width

      if (relX < dropZoneLeftPercent) {
        setAvailableStocks((prev) => prev.filter((s) => s !== symbol))
        setSelectedStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol]))
      }
    },
    []
  )

  const handleDrag = useCallback((clientX: number, clientY: number) => {
    if (dragPreviewRef.current) {
      dragPreviewRef.current.style.transform = `translate(${clientX}px, ${clientY}px) translate(-50%, -50%)`
    }
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const relX = (clientX - rect.left) / rect.width
    const over = relX < dropZoneLeftPercent
    if (isOverDropZoneRef.current !== over) {
      isOverDropZoneRef.current = over
      setIsOverDropZone(over)
    }
  }, [])

  const handleDragStart = useCallback((symbol: string, x: number, y: number) => {
    setDraggingSymbol(symbol)
    setDragPosition({ x, y })
  }, [])

  const handleRemove = useCallback((symbol: string) => {
    setSelectedStocks((prev) => prev.filter((s) => s !== symbol))
    setAvailableStocks((prev) => (prev.includes(symbol) ? prev : [...prev, symbol].sort()))
  }, [])

  const generateReport = useCallback(async () => {
    const range = dateRangeToISO(dateRange)
    if (!range) {
      showToast('error', '请选择日期范围')
      throw new Error('no_date_range')
    }
    const { start_date, end_date } = range
    const validation = validateReportParams(
      selectedStocks,
      start_date,
      end_date
    )
    if (!validation.ok) {
      showToast('error', validation.message)
      throw new Error('validation_failed')
    }
    const days = getRangeDays(start_date, end_date)
    if (days > MAX_RANGE_DAYS) {
      showToast('warning', `日期范围超过 ${MAX_RANGE_DAYS} 天，1 分钟级别数据可能不完整`)
    }
    const result = await triggerReportGeneration({
      symbols: selectedStocks,
      start_date,
      end_date,
    })
    if (result.success) {
      showToast('success', '✅ 研报已生成，请在「研报中心」查看')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('reports:refresh'))
      }
      return
    }
    showToast('error', result.error)
    throw new Error('generate_failed')
  }, [dateRange, selectedStocks, showToast])

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header
        className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl shrink-0"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-cyan-400/80" />
          <span className="text-sm font-medium text-white/90">AI 分析报告</span>
          <span className="text-xs text-white/50">
            已选 {selectedStocks.length} 只
          </span>
        </div>
        <WindowControls />
      </header>

      {/* Top: Workspace 约 70vh */}
      <div
        ref={containerRef}
        className="flex shrink-0 flex-col p-4 gap-4 overflow-visible"
        style={{ height: '70vh' }}
      >
        <div className="flex flex-1 min-h-0 gap-4 overflow-visible relative">
        {/* Left: 报告池 - 置于最底层，拖拽时不会被挡住 */}
        <motion.div
          ref={dropZoneRef}
          layout
          className="flex-[7] min-w-0 rounded-2xl overflow-hidden flex flex-col relative z-0"
          style={{
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: isOverDropZone
              ? '2px solid rgba(0, 229, 255, 0.5)'
              : '1px solid rgba(255,255,255,0.15)',
            boxShadow: isOverDropZone
              ? 'inset 0 0 40px rgba(0, 229, 255, 0.08), 0 4px 24px rgba(0,0,0,0.3)'
              : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.2)',
          }}
          animate={{
            scale: isOverDropZone ? 1.01 : 1,
            transition: spring,
          }}
          onDragOver={(e) => {
            e.preventDefault()
            if (!containerRef.current) return
            const rect = containerRef.current.getBoundingClientRect()
            const relX = (e.clientX - rect.left) / rect.width
            const over = relX < dropZoneLeftPercent
            if (isOverDropZoneRef.current !== over) {
              isOverDropZoneRef.current = over
              setIsOverDropZone(over)
            }
          }}
          onDragLeave={() => setIsOverDropZone(false)}
        >
          <div className="flex-1 p-6 overflow-auto">
            {selectedStocks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">
                <span>拖拽股票到这里生成报告</span>
              </div>
            ) : (
              <motion.div
                layout
                className="flex flex-wrap gap-2"
                transition={spring}
              >
                <AnimatePresence mode="popLayout">
                  {selectedStocks.map((s) => (
                    <StockTag
                      key={s}
                      symbol={s}
                      onRemove={handleRemove}
                      draggable={false}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right: 股票池 - 在上层且 overflow-visible，拖拽 tag 移入报告池时不被裁剪 */}
        <div className="flex-[3] min-w-[200px] flex flex-col rounded-xl overflow-visible bg-black/30 border border-white/10 relative z-20 min-h-0">
          <div className="px-4 py-3 border-b border-white/10 text-xs text-white/50 shrink-0">
            股票池 · 拖拽到左侧
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-visible p-3 min-h-0 rounded-b-xl bg-black/30">
            <motion.div
              layout
              className="flex flex-wrap gap-2"
              transition={spring}
            >
              <AnimatePresence mode="popLayout">
                {availableStocks.map((s) => (
                  <StockTag
                    key={s}
                    symbol={s}
                    onDrag={handleDrag}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    isDragging={draggingSymbol === s}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
        </div>
      </div>

      {/* Bottom: Control Deck（占满剩余高度，内容居中） */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <ControlPanel
          macroOn={macroOn}
          microOn={microOn}
          onMacroChange={setMacroOn}
          onMicroChange={setMicroOn}
          selectedStocks={selectedStocks}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onGenerate={generateReport}
          onValidationError={(msg) => showToast('error', msg)}
        />
      </div>

      {draggingSymbol &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dragPreviewRef}
            className="fixed pointer-events-none z-[9999] flex items-center justify-center left-0 top-0 will-change-transform"
            style={{
              transform: `translate(${dragPosition.x}px, ${dragPosition.y}px) translate(-50%, -50%)`,
            }}
          >
            <div
              className="
                inline-flex items-center justify-center rounded-full text-xs font-mono font-medium
                px-3 py-1.5 cursor-grabbing
                bg-white/15 text-white/95 border border-white/30
                shadow-lg
              "
            >
              {draggingSymbol}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
