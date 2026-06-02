import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  label: string
  holdLabel?: string       // shown while holding, default 'KEEP HOLDING…'
  holdMs: number
  onComplete: () => void
  bgStyle: string          // CSS value, e.g. 'var(--accent)' or 'var(--panel2)'
  textStyle?: string       // CSS value, default 'var(--ink)'
  height?: number          // px, default 64
  disabled?: boolean
  className?: string
}

export function LongPressButton({
  label,
  holdLabel = 'KEEP HOLDING…',
  holdMs,
  onComplete,
  bgStyle,
  textStyle = 'var(--ink)',
  height = 64,
  disabled = false,
  className = '',
}: Props) {
  const [progress, setProgress]   = useState(0)
  const [holding, setHolding]     = useState(false)
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startTimeRef.current = null
    completedRef.current = false
    setProgress(0)
    setHolding(false)
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    completedRef.current = false
    startTimeRef.current = Date.now()
    setHolding(true)
    const tick = () => {
      if (startTimeRef.current === null) return
      const p = Math.min((Date.now() - startTimeRef.current) / holdMs, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        completedRef.current = true
        rafRef.current = null
        startTimeRef.current = null
        onComplete()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [disabled, holdMs, onComplete])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <button
      className={`relative overflow-hidden w-full select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{ background: bgStyle, height, borderRadius: 18, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      disabled={disabled}
    >
      {/* Rising fill */}
      <span
        className="absolute inset-0 origin-bottom pointer-events-none"
        style={{ transform: `scaleY(${progress})`, background: 'rgba(255,255,255,0.26)', transition: 'none' }}
      />
      {/* Label */}
      <span
        className="relative z-10 font-display uppercase block"
        style={{
          letterSpacing: '0.04em',
          color: textStyle,
          transform: holding ? 'scale(0.72)' : 'scale(1)',
          transition: 'transform 0.1s ease',
        }}
      >
        {holding ? holdLabel : label}
      </span>
    </button>
  )
}
