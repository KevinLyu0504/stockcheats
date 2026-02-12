import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import React, { createContext, useCallback, useContext, useState } from 'react'

export type ToastType = 'error' | 'success' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="fixed bottom-6 left-1/2 z-[10000] -translate-x-1/2 rounded-xl border border-white/15 bg-black/90 px-4 py-3 text-sm backdrop-blur-xl"
                style={{
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  color:
                    t.type === 'error'
                      ? 'rgb(248, 113, 113)'
                      : t.type === 'warning'
                        ? 'rgb(251, 191, 36)'
                        : 'rgb(134, 239, 172)',
                }}
              >
                {t.message}
              </motion.div>
            ))}
          </AnimatePresence>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
