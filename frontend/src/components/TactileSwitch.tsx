import { motion } from 'framer-motion'
import React from 'react'

const switchSpring = { type: 'spring' as const, stiffness: 500, damping: 30 }

interface TactileSwitchProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  accentColor?: string
}

export const TactileSwitch: React.FC<TactileSwitchProps> = ({
  label,
  checked,
  onChange,
  accentColor: _accentColor = 'rgba(0, 229, 255, 0.9)',
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-white/70 tracking-wide">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-12 h-7 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
        style={{
          background: checked
            ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.25) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)',
          boxShadow: checked
            ? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 -1px 0 rgba(255,255,255,0.06)'
            : 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.05)',
          border: checked ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <motion.span
          className="absolute top-1 rounded-full"
          style={{
            width: 20,
            height: 20,
            left: 4,
            top: 4,
            background: checked
              ? 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(230,230,235,0.9) 100%)'
              : 'linear-gradient(180deg, rgba(120,120,120,0.9) 0%, rgba(60,60,60,0.95) 100%)',
            boxShadow: checked
              ? '0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4)'
              : '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
          animate={{ x: checked ? 24 : 0 }}
          transition={switchSpring}
        />
      </button>
    </div>
  )
}
