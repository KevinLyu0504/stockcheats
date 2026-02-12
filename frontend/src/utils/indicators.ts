/**
 * 技术指标计算（纯函数，可被 useMemo 缓存避免重复计算）
 */

export function calcEMA(closes: number[], period: number): number[] {
  if (!closes.length) return []
  const k = 2 / (period + 1)
  const out: number[] = []
  let ema = closes[0]
  for (let i = 0; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    out.push(ema)
  }
  return out
}

export function calcBollinger(closes: number[], period: number, mult: number) {
  if (!closes.length) return { mid: [] as number[], upper: [] as number[], lower: [] as number[] }
  const ema = calcEMA(closes, period)
  const upper: number[] = []
  const lower: number[] = []
  for (let i = 0; i < closes.length; i++) {
    const start = Math.max(0, i - period + 1)
    const slice = closes.slice(start, i + 1)
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length
    const variance = slice.reduce((s, v) => s + (v - avg) ** 2, 0) / slice.length
    const std = Math.sqrt(variance) || 0
    upper.push(ema[i] + mult * std)
    lower.push(ema[i] - mult * std)
  }
  return { mid: ema, upper, lower }
}

export function calcMACD(closes: number[]): { macd: number[]; signal: number[]; hist: number[] } {
  if (!closes.length) return { macd: [], signal: [], hist: [] }
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)
  const macd = ema12.map((e, i) => e - ema26[i])
  const signal = calcEMA(macd, 9)
  const hist = macd.map((m, i) => m - signal[i])
  return { macd, signal, hist }
}

export function calcRSI(closes: number[], period: number = 14): number[] {
  if (!closes.length) return []
  const out: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { out.push(50); continue }
    let gains = 0, losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const diff = closes[j] - closes[j - 1]
      if (diff > 0) gains += diff; else losses -= diff
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    out.push(100 - 100 / (1 + rs))
  }
  return out
}

export interface IndicatorResult {
  ema20: number[]
  bollU: number[]
  bollL: number[]
  macd: number[]
  signal: number[]
  hist: number[]
  rsi: number[]
}

export function computeAllIndicators(closes: number[]): IndicatorResult {
  const { macd, signal, hist } = calcMACD(closes)
  const { mid: ema20, upper: bollU, lower: bollL } = calcBollinger(closes, 20, 2)
  const rsi = calcRSI(closes, 14)
  return { ema20, bollU, bollL, macd, signal, hist, rsi }
}
