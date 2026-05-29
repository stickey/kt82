import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  label: string
  holdMs: number
  onComplete: () => void
  colorClass: string      // e.g. 'bg-blue-500'
  textClass?: string      // default 'text-white'
  disabled?: boolean
  className?: string
}

export function LongPressButton({ label, holdMs, onComplete, colorClass, textClass = 'text-white', disabled = false, className = '' }: Props) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startTimeRef.current = null
    completedRef.current = false
    setProgress(0)
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    completedRef.current = false
    startTimeRef.current = Date.now()

    const tick = () => {
      if (startTimeRef.current === null) return
      const elapsed = Date.now() - startTimeRef.current
      const p = Math.min(elapsed / holdMs, 1)
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
      rafRef.current = null
      startTimeRef.current = null
    }
  }, [])

  return (
    <button
      className={`relative overflow-hidden rounded-xl font-bold min-h-[64px] w-full select-none ${colorClass} ${textClass} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      disabled={disabled}
    >
      {/* Fill overlay rising from bottom */}
      <span
        className="absolute inset-0 bg-white/20 origin-bottom transition-none"
        style={{ transform: `scaleY(${progress})` }}
      />
      <span className="relative z-10 px-4 py-3 block">{label}</span>
    </button>
  )
}
