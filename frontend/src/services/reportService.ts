import { AxiosError } from 'axios'
import apiClient from '../api/client'
import { REPORT_TIMEOUT_MS } from '../config'
import type {
  DeleteReportResult,
  GenerateReportParams,
  GenerateReportResult,
  ReportContent,
  ReportMeta,
} from '../types/report'

const REPORT_GENERATE_PATH = '/api/report/generate'

/** yfinance 1 分钟数据推荐最大跨度（用于前端提示，不强制拦截） */
export const MAX_RANGE_DAYS = 7

export type { GenerateReportParams, GenerateReportResult, ReportContent, ReportMeta, DeleteReportResult }

export function validateReportParams(
  symbols: string[],
  startDate: string,
  endDate: string
): { ok: true } | { ok: false; message: string } {
  if (!symbols?.length) return { ok: false, message: '请至少选择一只股票' }
  if (!startDate || !endDate) return { ok: false, message: '请选择日期范围' }
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, message: '日期格式无效' }
  }
  if (start > end) return { ok: false, message: '开始日期不能晚于结束日期' }
  return { ok: true }
}

export function getRangeDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
}

export async function triggerReportGeneration(
  params: GenerateReportParams
): Promise<GenerateReportResult> {
  try {
    const res = await apiClient.post(REPORT_GENERATE_PATH, params, {
      timeout: REPORT_TIMEOUT_MS,
    })
    if (res.status >= 200 && res.status < 300) return { success: true }
    return { success: false, error: `请求失败 (${res.status})` }
  } catch (err) {
    const ax = err as AxiosError
    if (ax.code === 'ECONNABORTED' || ax.message?.includes('timeout')) {
      return { success: false, error: '请求超时，请稍后重试', isTimeout: true }
    }
    if (ax.response?.status === 500) {
      return { success: false, error: '服务器内部错误，请稍后重试' }
    }
    if (ax.response?.status && ax.response.status >= 400) {
      return { success: false, error: `请求失败 (${ax.response.status})` }
    }
    if (ax.message === 'Network Error' || !ax.response) {
      return { success: false, error: '网络错误，请检查连接' }
    }
    return { success: false, error: ax.message || '生成失败，请稍后重试' }
  }
}

export async function fetchReportList(): Promise<ReportMeta[]> {
  const { data } = await apiClient.get<ReportMeta[]>('/api/reports/list')
  return data
}

export async function fetchReportContent(filename: string): Promise<ReportContent> {
  const { data } = await apiClient.get<ReportContent>(
    `/api/reports/${encodeURIComponent(filename)}`
  )
  return data
}

export async function deleteReport(filename: string): Promise<DeleteReportResult> {
  try {
    await apiClient.delete(`/api/reports/${encodeURIComponent(filename)}`)
    return { success: true }
  } catch (err) {
    const ax = err as AxiosError
    if (ax.response?.status === 404) return { success: true }
    const msg =
      ax.response?.status === 403
        ? '没有权限删除该研报'
        : ax.response?.status === 500
          ? '服务器内部错误'
          : ax.message || '删除失败，请稍后重试'
    return { success: false, error: msg }
  }
}
