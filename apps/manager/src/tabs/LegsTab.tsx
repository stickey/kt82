import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Race, Leg } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

export function LegsTab({ race, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (race) load(race.id)
    else setLegs([])
  }, [race?.id])

  async function load(raceId: string) {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Leg[]>(`/races/${raceId}/legs`)
      setLegs(data)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load legs')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (!race) {
    return <p className="text-gray-500 py-10 text-center text-sm">Create a race first, then add legs here.</p>
  }
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]">
          + Add Leg
        </button>
      </div>

      {legs.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No legs yet — add the first one</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const open = expanded.has(leg.id)
          const hasHandoff = !!leg.handoff
          return (
            <div key={leg.id} className="bg-gray-900 rounded-xl overflow-hidden">
              {/* Leg row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors min-h-[52px]"
                onClick={() => toggleExpand(leg.id)}
              >
                <span className="text-gray-500 text-xs w-6 shrink-0 text-right">#{leg.legNumber}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">{leg.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{leg.distanceMiles} mi</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!hasHandoff && (
                    <span className="text-amber-400 text-xs">No handoff</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); /* edit leg — Task 8 */ }}
                    className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); /* delete leg — Task 8 */ }}
                    className="text-red-400 hover:text-red-300 text-xs min-h-[44px] px-1"
                  >
                    Delete
                  </button>
                  <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Handoff panel */}
              {open && (
                <div className="border-t border-gray-800 px-4 py-3 pl-[52px] bg-gray-950/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Handoff Point</p>
                  {hasHandoff ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">{leg.handoff!.name}</p>
                        {leg.handoff!.address && (
                          <p className="text-gray-400 text-xs mt-0.5">{leg.handoff!.address}</p>
                        )}
                        {(leg.handoff!.lat != null || leg.handoff!.lng != null) && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {leg.handoff!.lat}°, {leg.handoff!.lng}°
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => { /* edit handoff — Task 8 */ }}
                        className="text-blue-400 hover:text-blue-300 text-xs shrink-0 min-h-[44px] flex items-center"
                      >
                        Edit handoff
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-500 text-sm">No handoff set</p>
                      <button
                        onClick={() => { /* add handoff — Task 8 */ }}
                        className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] flex items-center"
                      >
                        + Add handoff
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
