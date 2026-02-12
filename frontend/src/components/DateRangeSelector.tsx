import { DayPicker } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import { AnimatePresence, motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import React, { useRef, useState } from 'react'
import type { DateRange } from 'react-day-picker'

/** yfinance 1 分钟数据仅支持最近 7 天内，超出会报错或返回空 */
const MAX_DAYS_AGO = 7

function getMinSelectableDate(): Date {
  const d = new Date()
  d.setDate(d.getDate() - MAX_DAYS_AGO)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatRangeLabel(range: DateRange | undefined): string {
  if (!range?.from) return '选择日期范围'
  const from = range.from
  const to = range.to ?? range.from
  const fmt = (d: Date) =>
    d.toLocaleDateString('zh-CN', { month: 'short', day: '2-digit' })
  return `${fmt(from)} - ${fmt(to)}`
}

/** 本地日期转 YYYY-MM-DD，避免 toISOString() 的 UTC 时区偏移 */
function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export interface DateRangeSelectorProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  /** 用于表单项等，可选 */
  id?: string
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  id,
}) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const minDate = getMinSelectableDate()

  return (
    <div className="relative flex flex-col items-center gap-2">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          inline-flex items-center gap-2 rounded-xl border border-white/15
          bg-black/40 px-4 py-2.5 text-sm text-white/90
          backdrop-blur-xl transition-colors hover:bg-black/50 hover:border-white/25
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]
        "
      >
        <Calendar size={18} className="text-cyan-400/90" aria-hidden />
        <span>{formatRangeLabel(value)}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-[9998]"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-label="选择日期范围"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="
                absolute bottom-full left-1/2 z-[9999] mb-2 -translate-x-1/2
                rounded-xl border border-white/15 bg-black/90 p-4 shadow-xl
                backdrop-blur-xl
              "
            >
              <p className="mb-3 text-xs text-white/50">
                仅支持最近 {MAX_DAYS_AGO} 天内（1 分钟数据限制）
              </p>
              <DayPicker
                mode="range"
                locale={zhCN}
                selected={value}
                onSelect={onChange}
                disabled={{ before: minDate }}
                defaultMonth={value?.from ?? new Date()}
                startMonth={minDate}
                className="rdp-dark"
                classNames={{
                  root: 'rdp-root',
                  month: 'p-0',
                  month_caption: 'flex justify-center text-white/90 text-sm mb-2',
                  nav: 'flex gap-1',
                  button_previous: 'text-white/70 hover:text-white rounded p-1',
                  button_next: 'text-white/70 hover:text-white rounded p-1',
                  month_grid: 'w-full border-collapse',
                  weekdays: 'text-white/50 text-xs',
                  weekday: 'p-1 font-medium',
                  day: 'p-0.5',
                  day_button:
                    'w-9 h-9 rounded-lg text-sm text-white/90 hover:bg-white/15 focus:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
                  selected:
                    'bg-cyan-500/40 text-white hover:bg-cyan-500/50 focus:bg-cyan-500/50',
                  range_start: 'rounded-l-lg bg-cyan-500/40 text-white',
                  range_end: 'rounded-r-lg bg-cyan-500/40 text-white',
                  range_middle: 'bg-cyan-500/20 text-white/90',
                  disabled: 'text-white/30 cursor-not-allowed',
                  today: 'text-cyan-400/90',
                  outside: 'text-white/30',
                  hidden: 'invisible',
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/** 将 DateRange 转为 API 需要的 start_date / end_date (YYYY-MM-DD) */
export function dateRangeToISO(range: DateRange | undefined): {
  start_date: string
  end_date: string
} | null {
  if (!range?.from) return null
  const from = range.from
  const to = range.to ?? range.from
  return { start_date: toISO(from), end_date: toISO(to) }
}
