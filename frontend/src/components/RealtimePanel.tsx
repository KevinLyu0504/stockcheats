import React from 'react'

export const RealtimePanel: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col">
      <header className="h-10 border-b border-white/10 flex items-center px-3 text-xs text-white/50 bg-black/40 backdrop-blur-xl">
        Gemini 实时分析（占位）
      </header>
      <div className="flex-1 p-3 text-xs text-white/60 space-y-2 overflow-auto">
        <div className="p-2 rounded-md bg-white/[0.03] border border-white/10">
          正在等待数据流接入...
        </div>
      </div>
    </div>
  )
}

