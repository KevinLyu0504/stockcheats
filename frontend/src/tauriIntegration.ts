// 这里放前端 <-> Tauri 的最小联调骨架逻辑
// - 在浏览器纯前端开发模式下不会报错（没有 Tauri 环境时自动跳过）
// - 在 Tauri 桌面环境下，会：
//   - 调用 get_latest_snapshot 命令
//   - 订阅 market://snapshot 事件

export type MarketSnapshot = {
  symbol: string
  price: number
  macd: number
  signal: number
  hist: number
  ts: number
}

type SnapshotListener = (snapshot: MarketSnapshot) => void

export function setupTauriMarketBridge(onSnapshot: SnapshotListener) {
  // 浏览器纯前端模式：window 上没有 Tauri 注入的内部对象，直接跳过
  if (typeof window === 'undefined') return
  const anyWindow = window as any
  if (!anyWindow.__TAURI_INTERNALS__) return

  let cleanup: (() => void) | null = null

  ;(async () => {
    try {
      const { listen } = await import('@tauri-apps/api/event')
      const { invoke } = await import('@tauri-apps/api/core')

      // 主动拉一次当前快照
      try {
        const snapshot = (await invoke('get_latest_snapshot')) as
          | MarketSnapshot
          | null
          | undefined
        if (snapshot) {
          onSnapshot(snapshot)
        }
      } catch (e) {
        console.error('[tauri] failed to invoke get_latest_snapshot', e)
      }

      // 订阅后台心跳推送的事件
      const unlisten = await listen<MarketSnapshot>('market://snapshot', (event) => {
        if (event.payload) {
          onSnapshot(event.payload)
        }
      })

      cleanup = () => {
        unlisten()
      }
    } catch (e) {
      console.error('[tauri] bridge setup failed', e)
    }
  })()

  return () => {
    if (cleanup) cleanup()
  }
}

