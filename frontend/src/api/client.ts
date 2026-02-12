import axios from 'axios'
import { API_BASE } from '../config'
import { STORAGE_KEYS } from '../constants'

const apiClient = axios.create({
  baseURL: API_BASE || undefined,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  try {
    const token = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
    if (token && token !== 'dev-bypass') {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

const AUTH_DISABLED = import.meta.env.VITE_AUTH_DISABLED === 'true'

/**
 * 401 时通过自定义事件通知 AuthContext logout，
 * 由 React Router 做页内跳转，避免 window.location.href 全页刷新。
 */
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!AUTH_DISABLED && err.response?.status === 401) {
      try {
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
        sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER)
      } catch {}
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(err)
  }
)

export default apiClient
