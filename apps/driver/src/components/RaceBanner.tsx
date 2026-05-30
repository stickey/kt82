import { useState, useEffect } from 'react'
import { formatRaceTime } from '../api'

interface Props {
  teamName: string
  raceStartedAt: string | null
}

export function RaceBanner({ teamName, raceStartedAt }: Props) {
  const [elapsedMs, setElapsedMs] = useState(
    raceStartedAt ? Math.max(0, Date.now() - new Date(raceStartedAt).getTime()) : 0
  )

  useEffect(() => {
    if (!raceStartedAt) {
      setElapsedMs(0)
      return
    }
    const start = new Date(raceStartedAt).getTime()
    setElapsedMs(Date.now() - start)
    const id = setInterval(() => setElapsedMs(Math.max(0, Date.now() - start)), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ background: '#0f172a', borderBottom: '2px solid #1e3a5f' }}
    >
      <div className="flex items-center gap-2">
        <div className="relative w-2.5 h-2.5 flex-shrink-0">
          <div className={`absolute inset-0 rounded-full bg-blue-400 ${raceStartedAt ? 'animate-ping' : ''} opacity-60`} />
          <div className="absolute inset-0 rounded-full bg-blue-400" />
        </div>
        <span className="text-sm font-semibold text-slate-400">{teamName}</span>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-bold leading-none text-blue-400">
          {formatRaceTime(Math.max(0, elapsedMs))}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">Race time</div>
      </div>
    </div>
  )
}
