import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
  type CandlestickData,
  type HistogramData,
  type IRange,
  type LineData,
  type Time,
  type IChartApi,
  type ISeriesApi,
} from 'lightweight-charts'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import apiClient from '../api/client'
import type { MarketSnapshot } from '../types/market'

type Timeframe = '1D' | '5D' | '1M'

/* ---------- helpers ---------- */

const priceFormatter = (value: number) => {
  if (value == null || Number.isNaN(value)) return ''
  return value.toFixed(2)
}

const CHART_OPTS = {
  layout: { background: { color: '#000000' }, textColor: 'rgba(255,255,255,0.7)' },
  grid: { vertLines: { color: '#1A1A1A' }, horzLines: { color: '#1A1A1A' } },
  rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
  crosshair: { vertLine: { color: 'rgba(255,255,255,0.3)' }, horzLine: { color: 'rgba(255,255,255,0.3)' } },
}

const toTime = (t: unknown): number => {
  if (typeof t === 'number') return t >= 1e12 ? Math.floor(t / 1000) : t
  if (typeof t === 'string') return Math.floor(new Date(t).getTime() / 1000)
  if (typeof t === 'object' && t && 'year' in t) {
    const b = t as { year: number; month: number; day: number }
    return Math.floor(new Date(b.year, b.month - 1, b.day).getTime() / 1000)
  }
  return 0
}

const timeFormatter = (time: unknown) =>
  new Date(toTime(time) * 1000).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const safeNum = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)

/* ---------- indicator calculations (from utils/indicators.ts) ---------- */
import { computeAllIndicators } from '../utils/indicators'

/* ---------- mock data ---------- */

interface HistoryBar { time: number; open: number; high: number; low: number; close: number; volume?: number }
interface HistoryResponse { data?: HistoryBar[] }

function filterToLatestDay(bars: HistoryBar[]): HistoryBar[] {
  if (!bars.length) return []
  const lastDate = new Date(bars[bars.length - 1].time * 1000)
  const dayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime() / 1000
  return bars.filter((b) => b.time >= dayStart)
}

function generateMockBars(count: number): HistoryBar[] {
  const now = Math.floor(Date.now() / 1000)
  const bars: HistoryBar[] = []
  let price = 100
  for (let i = count - 1; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 4
    const open = price
    price = Math.max(1, price + change)
    bars.push({
      time: now - i * 60,
      open,
      high: Math.max(open, price) + Math.random() * 2,
      low: Math.min(open, price) - Math.random() * 2,
      close: price,
      volume: Math.floor(100000 + Math.random() * 500000),
    })
  }
  return bars
}

/* ---------- component ---------- */

interface ApexChartProps {
  symbol?: string
  timeframe: Timeframe
  liveSnapshot?: MarketSnapshot | null
  onPriceChange?: (price: number | null) => void
}

export const ApexChart: React.FC<ApexChartProps> = ({
  symbol = 'CRWV',
  timeframe,
  liveSnapshot,
  onPriceChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const macdRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)

  const chartMainRef = useRef<IChartApi | null>(null)
  const chartMacdRef = useRef<IChartApi | null>(null)
  const chartRsiRef = useRef<IChartApi | null>(null)

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollUSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const bollLSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const macdLnRef = useRef<ISeriesApi<'Line'> | null>(null)
  const sigLnRef = useRef<ISeriesApi<'Line'> | null>(null)
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const rsiRef70Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const rsiRef30Ref = useRef<ISeriesApi<'Line'> | null>(null)

  const syncLockRef = useRef(false)
  const loadDataRef = useRef<() => void>(() => {})

  const dataRef = useRef<{
    times: number[]
    candle: CandlestickData[]
    ema20: number[]; bollU: number[]; bollL: number[]
    macd: number[]; signal: number[]; hist: number[]
    rsi: number[]
  }>({ times: [], candle: [], ema20: [], bollU: [], bollL: [], macd: [], signal: [], hist: [], rsi: [] })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [legend, setLegend] = useState<{
    main: { o: number; h: number; l: number; c: number; ema: number; bollU: number; bollL: number }
    macd: { macd: number; signal: number; hist: number }
    rsi: number
  } | null>(null)

  /* --- legend --- */
  const updateLegend = useCallback((time: number | null) => {
    const d = dataRef.current
    if (!d.times.length) return
    let i: number
    if (time == null) {
      i = d.times.length - 1
    } else {
      const idx = d.times.findIndex((t) => t > time)
      i = idx === -1 ? d.times.length - 1 : Math.max(0, idx - 1)
    }
    const n = (v: number | undefined) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)
    setLegend({
      main: {
        o: n(d.candle[i]?.open), h: n(d.candle[i]?.high),
        l: n(d.candle[i]?.low),  c: n(d.candle[i]?.close),
        ema: n(d.ema20[i]), bollU: n(d.bollU[i]), bollL: n(d.bollL[i]),
      },
      macd: { macd: n(d.macd[i]), signal: n(d.signal[i]), hist: n(d.hist[i]) },
      rsi: n(d.rsi[i]),
    })
  }, [])

  /* --- data loading --- */
  const HISTORY_FETCH_TIMEOUT_MS = 15000

  const loadData = useCallback(async () => {
    const cm = chartMainRef.current
    const cMacd = chartMacdRef.current
    const cRsi = chartRsiRef.current
    if (!cm || !cMacd || !cRsi) return          // charts not ready yet

    setLoading(true)
    setError(null)
    try {
      const tf = timeframe === '1M' ? '1d' : '1m'
      const url = `/api/history/${symbol}?timeframe=${tf}`
      let raw: HistoryBar[] = []
      try {
        const res = await apiClient.get<HistoryResponse & { bars?: HistoryBar[] }>(url, {
          timeout: HISTORY_FETCH_TIMEOUT_MS,
        })
        const json = res.data
        raw = json.data ?? json.bars ?? (Array.isArray(json) ? (json as unknown as HistoryBar[]) : [])
      } catch (e) {
        if ((e as Error).message?.includes('timeout') || (e as Error).name === 'AbortError') {
          setError('请求超时，显示模拟数据')
        } else {
          setError('无法连接服务器，显示模拟数据')
        }
        raw = generateMockBars(timeframe === '1M' ? 60 : 120)
      }

      if (!raw.length) {
        setError('API 暂无数据，显示 Mock')
        raw = generateMockBars(timeframe === '1M' ? 60 : 120)
      }
      if (timeframe === '1D') raw = filterToLatestDay(raw)

      // Build candle data
      const candle: CandlestickData[] = raw.map((b) => ({
        time: toTime(b.time) as unknown as Time,
        open: safeNum(b.open), high: safeNum(b.high),
        low: safeNum(b.low),   close: safeNum(b.close),
      }))
      const closes = candle.map((d) => d.close)

      // Calculate indicators (pure function, cacheable)
      const { macd, signal, hist, ema20, bollU, bollL, rsi } = computeAllIndicators(closes)

      // Store for legend
      dataRef.current = {
        times: candle.map((c) => toTime(c.time as unknown as number)),
        candle, ema20, bollU, bollL, macd, signal, hist, rsi,
      }

      // Build series data arrays (same length as candle, guaranteed)
      const lineOf = (arr: number[]): LineData[] =>
        candle.map((c, i) => ({ time: c.time, value: arr[i] ?? 0 }))

      const histData: HistogramData[] = candle.map((c, i) => ({
        time: c.time,
        value: hist[i] ?? 0,
        color: (hist[i] ?? 0) >= 0 ? '#00C853' : '#FF3D00',
      }))

      // Set data on all series
      candleSeriesRef.current?.setData(candle)
      emaSeriesRef.current?.setData(lineOf(ema20))
      bollUSeriesRef.current?.setData(lineOf(bollU))
      bollLSeriesRef.current?.setData(lineOf(bollL))
      macdHistRef.current?.setData(histData)
      macdLnRef.current?.setData(lineOf(macd))
      sigLnRef.current?.setData(lineOf(signal))
      rsiSeriesRef.current?.setData(lineOf(rsi))
      rsiRef70Ref.current?.setData(candle.map((c) => ({ time: c.time, value: 70 })))
      rsiRef30Ref.current?.setData(candle.map((c) => ({ time: c.time, value: 30 })))

      onPriceChange?.(candle[candle.length - 1]?.close ?? null)

      // Fit view
      try {
        if (timeframe === '1M' && candle.length > 30) {
          cm.timeScale().setVisibleRange({
            from: candle[candle.length - 30].time,
            to: candle[candle.length - 1].time,
          })
        } else {
          cm.timeScale().fitContent()
        }
      } catch { /* ignore */ }

      updateLegend(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [timeframe, symbol, onPriceChange, updateLegend])

  // Keep loadDataRef always pointing to the latest loadData
  loadDataRef.current = loadData

  /* --- Effect 1: CREATE charts (runs once) --- */
  useEffect(() => {
    if (!containerRef.current || !mainRef.current || !macdRef.current || !rsiRef.current) return

    const cw = Math.max(containerRef.current.clientWidth, 400)
    const totalH = Math.max(containerRef.current.clientHeight, 300)
    const hMain = Math.floor(totalH * 0.6)
    const hMacd = Math.floor(totalH * 0.2)
    const hRsi = totalH - hMain - hMacd

    const tsOpts = {
      borderColor: 'rgba(255,255,255,0.1)',
      timeVisible: true, secondsVisible: false,
      fixRightEdge: true, fixLeftEdge: true,
      tickMarkFormatter: timeFormatter,
    }
    const loc = { priceFormatter, timeFormatter }

    const cm = createChart(mainRef.current, {
      ...CHART_OPTS, width: cw, height: hMain,
      timeScale: { ...tsOpts, visible: false }, localization: loc,
    })
    const cMacd = createChart(macdRef.current, {
      ...CHART_OPTS, width: cw, height: hMacd,
      timeScale: { ...tsOpts, visible: false }, localization: loc,
    })
    const cRsi = createChart(rsiRef.current, {
      ...CHART_OPTS, width: cw, height: hRsi,
      timeScale: tsOpts, localization: loc,
    })

    // --- series ---
    candleSeriesRef.current = cm.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350',
      borderUpColor: '#26a69a', borderDownColor: '#ef5350',
    })
    emaSeriesRef.current = cm.addSeries(LineSeries, { color: '#F7B500', lineWidth: 2 })
    bollUSeriesRef.current = cm.addSeries(LineSeries, { color: '#00E5FF', lineWidth: 1 })
    bollLSeriesRef.current = cm.addSeries(LineSeries, { color: '#00E5FF', lineWidth: 1 })

    macdHistRef.current = cMacd.addSeries(HistogramSeries, { priceScaleId: 'right' })
    macdLnRef.current = cMacd.addSeries(LineSeries, { color: '#FFFFFF', lineWidth: 2, priceScaleId: 'right' })
    sigLnRef.current = cMacd.addSeries(LineSeries, { color: '#F7B500', lineWidth: 2, priceScaleId: 'right' })

    rsiRef70Ref.current = cRsi.addSeries(LineSeries, {
      color: 'rgba(128,128,128,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false,
    })
    rsiRef30Ref.current = cRsi.addSeries(LineSeries, {
      color: 'rgba(128,128,128,0.6)', lineWidth: 1, lineStyle: LineStyle.Dashed, lastValueVisible: false,
    })
    rsiSeriesRef.current = cRsi.addSeries(LineSeries, { color: '#D500F9', lineWidth: 2 })

    chartMainRef.current = cm
    chartMacdRef.current = cMacd
    chartRsiRef.current = cRsi

    // --- time sync (with try-catch to prevent crash) ---
    const syncFrom = (_source: IChartApi, targets: IChartApi[]) => {
      return (range: IRange<Time> | null) => {
        if (syncLockRef.current || !range) return
        syncLockRef.current = true
        try { targets.forEach((t) => t.timeScale().setVisibleRange(range)) }
        catch { /* swallow */ }
        finally { syncLockRef.current = false }
      }
    }
    const sh1 = syncFrom(cm, [cMacd, cRsi])
    const sh2 = syncFrom(cMacd, [cm, cRsi])
    const sh3 = syncFrom(cRsi, [cm, cMacd])
    cm.timeScale().subscribeVisibleTimeRangeChange(sh1)
    cMacd.timeScale().subscribeVisibleTimeRangeChange(sh2)
    cRsi.timeScale().subscribeVisibleTimeRangeChange(sh3)

    // --- crosshair ---
    const onCross = (param: { time?: unknown }) => {
      const t = param.time != null ? toTime(param.time) : null
      updateLegend(t)
    }
    cm.subscribeCrosshairMove(onCross)
    cMacd.subscribeCrosshairMove(onCross)
    cRsi.subscribeCrosshairMove(onCross)

    // --- resize ---
    const ro = new ResizeObserver(() => {
      const pw = containerRef.current?.clientWidth ?? cw
      const ph = containerRef.current?.clientHeight ?? totalH
      const hm = Math.floor(ph * 0.6)
      const hd = Math.floor(ph * 0.2)
      const hr = ph - hm - hd
      cm.applyOptions({ width: pw, height: hm })
      cMacd.applyOptions({ width: pw, height: hd })
      cRsi.applyOptions({ width: pw, height: hr })
    })
    ro.observe(containerRef.current)

    // *** KEY FIX: load data AFTER charts are created ***
    loadDataRef.current()

    return () => {
      ro.disconnect()
      cm.timeScale().unsubscribeVisibleTimeRangeChange(sh1)
      cMacd.timeScale().unsubscribeVisibleTimeRangeChange(sh2)
      cRsi.timeScale().unsubscribeVisibleTimeRangeChange(sh3)
      cm.unsubscribeCrosshairMove(onCross)
      cMacd.unsubscribeCrosshairMove(onCross)
      cRsi.unsubscribeCrosshairMove(onCross)
      cm.remove(); cMacd.remove(); cRsi.remove()
      chartMainRef.current = null; chartMacdRef.current = null; chartRsiRef.current = null
      candleSeriesRef.current = null; emaSeriesRef.current = null
      bollUSeriesRef.current = null;  bollLSeriesRef.current = null
      macdHistRef.current = null; macdLnRef.current = null; sigLnRef.current = null
      rsiSeriesRef.current = null; rsiRef70Ref.current = null; rsiRef30Ref.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* --- Effect 2: reload data when timeframe/symbol changes (NOT initial load) --- */
  const initialRef = useRef(true)
  useEffect(() => {
    if (initialRef.current) { initialRef.current = false; return }
    loadData()
  }, [loadData])

  /* --- Effect 3: live update --- */
  useEffect(() => {
    if (timeframe === '1M' || !liveSnapshot) return
    const t = liveSnapshot.time ?? Math.floor(Date.now() / 1000)
    const p = liveSnapshot.price
    if (p == null) return
    const s = candleSeriesRef.current
    if (s) {
      s.update({ time: t as unknown as Time, open: p, high: p, low: p, close: p })
      onPriceChange?.(p)
    }
    updateLegend(null)
  }, [timeframe, liveSnapshot, onPriceChange, updateLegend])

  /* --- render --- */
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col bg-black relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 text-white">
          Loading {symbol}...
        </div>
      )}
      {error && !loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-white/10 text-amber-400 text-xs z-20">
          {error}
        </div>
      )}
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 gap-0 overflow-hidden">
        {/* Main chart */}
        <div className="relative flex-[6] min-h-0 shrink-0 overflow-hidden">
          <div ref={mainRef} className="w-full h-full min-h-0" />
          {legend && (
            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-xs font-mono space-y-0.5" style={{ pointerEvents: 'none' }}>
              <span className="text-white/80">
                O:{legend.main.o.toFixed(2)} H:{legend.main.h.toFixed(2)} L:{legend.main.l.toFixed(2)} C:{legend.main.c.toFixed(2)}
              </span><br />
              <span style={{ color: '#F7B500' }}>EMA20: {legend.main.ema.toFixed(2)}</span><br />
              <span style={{ color: '#00E5FF' }}>BOLL: {legend.main.bollU.toFixed(2)} / {legend.main.bollL.toFixed(2)}</span>
            </div>
          )}
        </div>
        {/* MACD chart */}
        <div className="relative flex-[2] min-h-0 shrink-0 overflow-hidden">
          <div ref={macdRef} className="w-full h-full min-h-0" />
          {legend && (
            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-xs font-mono" style={{ pointerEvents: 'none' }}>
              <span style={{ color: '#FFFFFF' }}>DIF: {legend.macd.macd.toFixed(3)}</span>{' '}
              <span style={{ color: '#F7B500' }}>DEA: {legend.macd.signal.toFixed(3)}</span>{' '}
              <span style={{ color: legend.macd.hist >= 0 ? '#00C853' : '#FF3D00' }}>Hist: {legend.macd.hist.toFixed(3)}</span>
            </div>
          )}
        </div>
        {/* RSI chart */}
        <div className="relative flex-[2] min-h-0 shrink-0 overflow-hidden">
          <div ref={rsiRef} className="w-full h-full min-h-0" />
          {legend && (
            <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded bg-black/70 text-xs font-mono" style={{ pointerEvents: 'none' }}>
              <span style={{ color: '#D500F9' }}>RSI(14): {legend.rsi.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
