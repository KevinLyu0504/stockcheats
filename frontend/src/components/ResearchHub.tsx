import { FileText, Loader2, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useToast } from '../contexts/ToastContext'
import { deleteReport, fetchReportContent, fetchReportList } from '../services/reportService'
import type { ReportContent, ReportMeta } from '../types/report'
import { WindowControls } from './WindowControls'

const PAGE_SIZE = 20

function filenameToTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '')
  const parts = base.split('_')
  if (parts.length >= 3) {
    const symbol = parts[1]
    const date = parts[2]
    return `《 ${symbol} ${date} 的研究 》`
  }
  return filename
}

function toDate(value: number | string | undefined): Date | null {
  if (value === undefined) return null
  if (typeof value === 'number') return new Date(value * 1000)
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatRelativeTime(raw: number | string): string {
  const d = toDate(raw)
  if (!d) return String(raw)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  if (Number.isNaN(diffMs)) return d.toLocaleString('zh-CN')
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return '刚刚'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day} 天前`
  return d.toLocaleDateString('zh-CN')
}

export const ResearchHub: React.FC = () => {
  const { showToast } = useToast()
  const [list, setList] = useState<ReportMeta[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const [selectedFilename, setSelectedFilename] = useState<string | null>(null)
  const [contentMap, setContentMap] = useState<Record<string, ReportContent>>({})
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const visibleList = useMemo(() => list.slice(0, visibleCount), [list, visibleCount])
  const hasMore = visibleCount < list.length

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (!hasMore) return
      const el = e.currentTarget
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, list.length))
      }
    },
    [hasMore, list.length]
  )

  useEffect(() => {
    let mounted = true

    const loadList = async () => {
      try {
        setListLoading(true)
        const data = await fetchReportList()
        if (!mounted) return
        const sorted = [...data].sort((a, b) => {
          const da = toDate(a.created_at)?.getTime() ?? 0
          const db = toDate(b.created_at)?.getTime() ?? 0
          return db - da
        })
        setList(sorted)
        setListError(null)
        if (sorted.length > 0) {
          setSelectedFilename((prev) => prev ?? sorted[0].filename)
        }
      } catch {
        if (!mounted) return
        setListError('研报列表加载失败，请稍后重试')
      } finally {
        if (mounted) setListLoading(false)
      }
    }

    loadList()

    const handleRefresh = () => { loadList() }
    window.addEventListener('reports:refresh', handleRefresh)
    return () => {
      mounted = false
      window.removeEventListener('reports:refresh', handleRefresh)
    }
  }, [])

  useEffect(() => {
    if (!selectedFilename) return
    if (contentMap[selectedFilename]) {
      setContentError(null)
      return
    }
    let mounted = true
    ;(async () => {
      try {
        setContentLoading(true)
        const data = await fetchReportContent(selectedFilename)
        if (!mounted) return
        setContentMap((prev) => ({ ...prev, [selectedFilename]: data }))
        setContentError(null)
      } catch {
        if (!mounted) return
        setContentError('研报加载失败，请稍后重试')
      } finally {
        if (mounted) setContentLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [selectedFilename, contentMap])

  const selectedContent = selectedFilename ? contentMap[selectedFilename] : undefined

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <header
        className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-xl shrink-0"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-cyan-400/80" />
          <span className="text-sm font-medium text-white/90">研报中心 Research Hub</span>
          {list.length > 0 && (
            <span className="text-xs text-white/50">共 {list.length} 份</span>
          )}
        </div>
        <WindowControls />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 左侧列表 */}
        <aside className="w-80 border-r border-white/10 bg-black/40 backdrop-blur-xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-white/10 text-xs text-white/60">
            最近生成的研报
          </div>
          <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
            {listLoading ? (
              <div className="p-4 text-xs text-white/50 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span>正在加载研报列表...</span>
              </div>
            ) : listError ? (
              <div className="p-4 text-xs text-red-300">{listError}</div>
            ) : list.length === 0 ? (
              <div className="p-4 text-xs text-white/50">
                暂无研报，请先在「AI 分析报告」中生成。
              </div>
            ) : (
              <ul className="py-2">
                {visibleList.map((meta) => {
                  const active = meta.filename === selectedFilename
                  const isDeleting = deleting === meta.filename
                  const title = filenameToTitle(meta.filename)
                  return (
                    <li key={meta.filename}>
                      <div
                        className={`w-full flex items-stretch text-xs border-l-2 transition-colors ${
                          active
                            ? 'bg-white/10 border-cyan-400 text-white'
                            : 'border-transparent hover:bg-white/5 text-white/70'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedFilename(meta.filename)}
                          className="flex-1 text-left px-3 py-2.5"
                        >
                          <div className="line-clamp-1 font-medium">{title}</div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-white/50">
                            <span>{formatRelativeTime(meta.created_at)}</span>
                            {meta.symbols && meta.symbols.length > 0 && (
                              <span className="flex gap-1">
                                {meta.symbols.map((s) => (
                                  <span
                                    key={s}
                                    className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-white/80"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-label="删除研报"
                          className="px-2 pr-3 flex items-center text-white/40 hover:text-red-300"
                          onClick={async (e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            if (isDeleting) return
                            if (!window.confirm(`确定要删除 ${title} 吗？该研报将从服务器移除。`)) return
                            setDeleting(meta.filename)
                            try {
                              const res = await deleteReport(meta.filename)
                              if (!res.success) {
                                showToast('error', `删除失败：${res.error}`)
                                return
                              }
                              setContentMap((prev) => {
                                const copy = { ...prev }
                                delete copy[meta.filename]
                                return copy
                              })
                              setList((prev) => {
                                const filtered = prev.filter((m) => m.filename !== meta.filename)
                                if (selectedFilename === meta.filename) {
                                  const idx = prev.findIndex((m) => m.filename === meta.filename)
                                  const neighbor = filtered[idx] ?? filtered[idx - 1]
                                  setSelectedFilename(neighbor ? neighbor.filename : null)
                                }
                                return filtered
                              })
                              showToast('success', '研报已删除')
                            } finally {
                              setDeleting(null)
                            }
                          }}
                        >
                          {isDeleting ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </li>
                  )
                })}
                {hasMore && (
                  <li className="p-3 text-center text-xs text-white/40">
                    <Loader2 size={14} className="animate-spin inline mr-1" />
                    滚动加载更多...
                  </li>
                )}
              </ul>
            )}
          </div>
        </aside>

        {/* 右侧阅读区 */}
        <main className="flex-1 min-w-0 bg-[#050505]">
          {!selectedFilename ? (
            <div className="h-full flex flex-col items-center justify-center text-white/40 text-sm">
              <div className="mb-3">
                <FileText size={32} className="text-white/30" />
              </div>
              <p>请选择一份研报进行阅读</p>
            </div>
          ) : contentLoading && !selectedContent ? (
            <div className="h-full flex items-center justify-center text-xs text-white/50 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span>正在加载研报内容...</span>
            </div>
          ) : contentError ? (
            <div className="h-full flex items-center justify-center text-xs text-red-300">
              {contentError}
            </div>
          ) : selectedContent ? (
            <div className="h-full flex flex-col min-h-0">
              <div className="px-6 py-4 border-b border-white/10">
                <div className="text-base font-semibold text-white">
                  {filenameToTitle(selectedContent.filename)}
                </div>
                {selectedContent.created_at && (
                  <div className="mt-1 text-[11px] text-white/50">
                    生成时间：{toDate(selectedContent.created_at)?.toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: (props) => <h1 className="text-xl font-semibold text-amber-300 mb-4" {...props} />,
                    h2: (props) => <h2 className="text-lg font-semibold text-cyan-300 mt-4 mb-2" {...props} />,
                    h3: (props) => <h3 className="text-sm font-semibold text-white mt-3 mb-1.5" {...props} />,
                    p: (props) => <p className="text-sm text-white/80 leading-relaxed mb-2" {...props} />,
                    ul: (props) => <ul className="list-disc list-inside text-sm text-white/80 mb-2" {...props} />,
                    ol: (props) => <ol className="list-decimal list-inside text-sm text-white/80 mb-2" {...props} />,
                    table: (props) => (
                      <div className="my-4 overflow-x-auto">
                        <table className="w-full text-xs border-collapse border border-white/10" {...props} />
                      </div>
                    ),
                    th: (props) => <th className="border border-white/20 bg-white/10 px-2 py-1 text-left text-white/90" {...props} />,
                    td: (props) => <td className="border border-white/10 px-2 py-1 align-top text-white/80" {...props} />,
                    code: (props) => <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-emerald-200" {...props} />,
                  }}
                >
                  {selectedContent.content}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-white/50">
              暂无可显示内容
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
