export interface MarketSnapshot {
  price?: number
  volume?: number
  time?: number
  macd?: number
  signal?: number
  [key: string]: unknown
}

export type MarketData = Record<string, MarketSnapshot>
