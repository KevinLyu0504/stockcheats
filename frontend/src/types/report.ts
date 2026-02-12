/** 报告生成请求参数（与后端 FastAPI 对齐） */
export interface GenerateReportParams {
  symbols: string[]
  start_date: string
  end_date: string
}

/** 触发生成的标准化结果 */
export type GenerateReportResult =
  | { success: true }
  | { success: false; error: string; isTimeout?: boolean }

/** 研报列表元信息 */
export interface ReportMeta {
  filename: string
  created_at: number | string
  size?: number
  symbols?: string[]
}

/** 单个研报内容（Markdown） */
export interface ReportContent {
  filename: string
  created_at?: number | string
  content: string
  symbols?: string[]
}

/** 删除结果 */
export type DeleteReportResult =
  | { success: true }
  | { success: false; error: string }
