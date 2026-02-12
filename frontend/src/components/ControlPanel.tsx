import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import React, { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { DateRangeSelector, dateRangeToISO } from './DateRangeSelector'
import { TactileSwitch } from './TactileSwitch'

const spring = { type: 'spring' as const, stiffness: 400, damping: 25 }

export interface ControlPanelProps {
  macroOn: boolean
  microOn: boolean
  onMacroChange: (on: boolean) => void
  onMicroChange: (on: boolean) => void
  /** 当前已选股票（报告池中的列表） */
  selectedStocks: string[]
  /** 日期范围（用于生成报告） */
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  /** 点击「生成报告」时调用，返回 Promise；验证失败或请求失败时应 throw，以便触发抖动 */
  onGenerate?: () => Promise<void>
  /** 校验失败时由父组件展示错误提示（如 toast） */
  onValidationError?: (message: string) => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  macroOn,
  microOn,
  onMacroChange,
  onMicroChange,
  selectedStocks,
  dateRange,
  onDateRangeChange,
  onGenerate,
  onValidationError,
}) => {
  const [generateStatus, setGenerateStatus] = useState<'idle' | 'loading' | 'done'>('idle')
  const [shake, setShake] = useState(false)

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleGenerate = async () => {
    if (generateStatus === 'loading') return
    if (selectedStocks.length === 0) {
      onValidationError?.('请至少选择一只股票')
      triggerShake()
      return
    }
    const range = dateRangeToISO(dateRange)
    if (!range) {
      onValidationError?.('请选择日期范围')
      triggerShake()
      return
    }
    setGenerateStatus('loading')
    try {
      await onGenerate?.()
      setGenerateStatus('done')
      setTimeout(() => setGenerateStatus('idle'), 2000)
    } catch {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      setGenerateStatus('idle')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-6 px-4 bg-black/20 border-t border-white/10 min-h-0">
      <div className="flex flex-wrap items-end justify-center gap-8">
        <DateRangeSelector value={dateRange} onChange={onDateRangeChange} />
        <div className="flex items-end gap-12">
          <TactileSwitch
            label="宏观"
            checked={macroOn}
            onChange={onMacroChange}
            accentColor="rgba(0, 229, 255, 0.9)"
          />
          <TactileSwitch
            label="微观"
            checked={microOn}
            onChange={onMicroChange}
            accentColor="rgba(0, 200, 120, 0.9)"
          />
        </div>
      </div>

      <motion.button
        type="button"
        onClick={handleGenerate}
        disabled={generateStatus === 'loading'}
        className="relative w-64 h-12 rounded-full font-medium text-sm text-white
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]
          disabled:opacity-70 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 180, 220, 0.9) 0%, rgba(100, 80, 220, 0.9) 100%)',
          boxShadow: '0 4px 20px rgba(0, 180, 220, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
        whileHover={{ scale: 1.05, boxShadow: '0 6px 28px rgba(0, 180, 220, 0.45), inset 0 1px 0 rgba(255,255,255,0.25)' }}
        whileTap={{ scale: 0.95 }}
        animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : {}}
        transition={shake ? { duration: 0.5 } : spring}
      >
        {generateStatus === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={20} className="animate-spin text-white" />
            <span>生成中...</span>
          </span>
        ) : (
          <span>{generateStatus === 'done' ? '报告生成完毕' : '生成报告'}</span>
        )}
      </motion.button>
    </div>
  )
}
