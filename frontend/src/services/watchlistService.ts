import apiClient from '../api/client'

export interface WatchlistItem {
  symbol: string
  [key: string]: unknown
}

/** 从后端获取自选股列表（按 user_id 隔离） */
export async function fetchWatchlist(): Promise<string[]> {
  const { data } = await apiClient.get<WatchlistItem[]>('/api/watchlist')
  return Array.isArray(data) ? data.map((x) => String(x.symbol ?? '')).filter(Boolean) : []
}

/** 添加自选 */
export async function addToWatchlist(symbol: string): Promise<void> {
  await apiClient.post(`/api/watchlist/${encodeURIComponent(symbol)}`)
}

/** 移除自选 */
export async function removeFromWatchlist(symbol: string): Promise<void> {
  await apiClient.delete(`/api/watchlist/${encodeURIComponent(symbol)}`)
}
