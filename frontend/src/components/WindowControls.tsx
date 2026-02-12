import React, { useEffect, useState } from 'react'

type BtnProps = { onClick: () => void; children: React.ReactNode; className?: string }

const Btn: React.FC<BtnProps> = ({ onClick, children, className }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors ${className ?? ''}`}
  >
    {children}
  </button>
)

export const WindowControls: React.FC = () => {
  const [isTauri, setIsTauri] = useState(false)

  useEffect(() => {
    const w = window as any
    setIsTauri(!!w.__TAURI_INTERNALS__)
  }, [])

  if (!isTauri) return null

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().minimize()
    } catch (e) {
      console.error('[WindowControls] minimize failed', e)
    }
  }

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().toggleMaximize()
    } catch (e) {
      console.error('[WindowControls] maximize failed', e)
    }
  }

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    } catch (e) {
      console.error('[WindowControls] close failed', e)
    }
  }

  return (
    <div className="flex items-stretch h-10">
      <Btn onClick={handleMinimize}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="0" y="5" width="12" height="1" />
        </svg>
      </Btn>
      <Btn onClick={handleMaximize}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="0" y="0" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </Btn>
      <Btn onClick={handleClose} className="hover:bg-red-500/30 hover:text-red-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1" />
        </svg>
      </Btn>
    </div>
  )
}
