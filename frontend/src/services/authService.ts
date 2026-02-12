import { AxiosError } from 'axios'
import apiClient from '../api/client'
import { STORAGE_KEYS } from '../constants'
import type { User } from '../types/user'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
  email?: string
}

export interface AuthResponse {
  access_token: string
  token_type?: string
  user?: User
}

/** 使用 sessionStorage：关闭软件后 token 自动清除，每次启动需重新登录 */
const tokenStorage = typeof sessionStorage !== 'undefined' ? sessionStorage : (null as unknown as Storage)

export function getStoredToken(): string | null {
  try {
    return tokenStorage?.getItem(STORAGE_KEYS.AUTH_TOKEN) ?? null
  } catch {
    return null
  }
}

export function getStoredUser(): User | null {
  try {
    const s = tokenStorage?.getItem(STORAGE_KEYS.AUTH_USER)
    return s ? (JSON.parse(s) as User) : null
  } catch {
    return null
  }
}

export function setAuth(token: string, user?: User): void {
  try {
    tokenStorage?.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
    if (user) {
      tokenStorage?.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user))
    }
  } catch {}
}

export function clearAuth(): void {
  try {
    tokenStorage?.removeItem(STORAGE_KEYS.AUTH_TOKEN)
    tokenStorage?.removeItem(STORAGE_KEYS.AUTH_USER)
  } catch {}
}

/** 记住的账号（仅用户名，不存密码） */
export function getRememberedAccounts(): string[] {
  try {
    const s = localStorage.getItem(STORAGE_KEYS.REMEMBERED_ACCOUNTS)
    const arr = s ? JSON.parse(s) : []
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function addRememberedAccount(username: string): void {
  const list = getRememberedAccounts()
  const next = [...list.filter((x) => x !== username), username]
  localStorage.setItem(STORAGE_KEYS.REMEMBERED_ACCOUNTS, JSON.stringify(next))
}

export function removeRememberedAccount(username: string): void {
  const list = getRememberedAccounts().filter((x) => x !== username)
  localStorage.setItem(STORAGE_KEYS.REMEMBERED_ACCOUNTS, JSON.stringify(list))
}

export async function login(params: LoginParams): Promise<AuthResponse> {
  try {
    const formData = new URLSearchParams()
    formData.append('username', params.username)
    formData.append('password', params.password)
    const { data } = await apiClient.post<AuthResponse>(
      '/api/auth/token',
      formData.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    )
    return data
  } catch (err) {
    const ax = err as AxiosError
    if (ax.response?.status === 400 || ax.response?.status === 401) {
      throw new Error(extractDetail(ax))
    }
    throw err
  }
}

function extractDetail(err: AxiosError): string {
  const data = err.response?.data as { detail?: string | Array<{ msg?: string }> } | undefined
  const detail = data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0]
    return typeof first === 'object' && first?.msg != null
      ? String(first.msg)
      : JSON.stringify(detail)
  }
  return err.message || '请求失败，请稍后重试'
}

export async function register(params: RegisterParams): Promise<AuthResponse> {
  try {
    const { data } = await apiClient.post<AuthResponse>('/api/auth/register', params)
    return data
  } catch (err) {
    const ax = err as AxiosError
    if (ax.response?.status === 400) {
      throw new Error(extractDetail(ax))
    }
    throw err
  }
}
