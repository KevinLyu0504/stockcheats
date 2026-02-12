// 后端 API 根地址：优先使用环境变量，禁止在代码中写死 IP
const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined
const DEFAULT_API_URL = 'http://192.168.68.63:8000'
export const API_BASE = import.meta.env.DEV ? '' : (VITE_API_URL ?? DEFAULT_API_URL)
const API_ORIGIN = VITE_API_URL ?? DEFAULT_API_URL
const WS_ORIGIN = API_ORIGIN.replace(/^http/, 'ws')
export const WS_URL = import.meta.env.DEV
  ? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/market`
  : `${WS_ORIGIN}/ws/market`

/** 报告生成请求超时（毫秒），避免长时间挂起 */
export const REPORT_TIMEOUT_MS = 30_000

