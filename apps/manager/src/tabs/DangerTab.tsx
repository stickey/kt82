import { useState, useEffect } from 'react'
import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Team } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
  onRaceWipe: () => void
}

type Confirm =
  | { type: 'clearResults' }
  | { type: 'clearAssignments' }
  | { type: 'deleteTeam'; team: Team }
  | { type: 'wipeAll' }

export function DangerTab({ race, on401, onRaceWipe }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (race) loadTeams(race.id)
    else setTeams([])
  }, [race?.id])

  async function loadTeams(raceId: string) {
    setLoading(true)
    try {
      const data = await api.get<Team[]>(`/races/${raceId}/teams`)
      setTeams(data)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) on401()
    } finally {
      setLoading(false)
    }
  }

  function openConfirm(c: Confirm) {
    setError('')
    setSuccess('')
    setConfirm(c)
  }

  async function handleConfirm() {
    if (!confirm || !race) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (confirm.type === 'clearResults') {
        await api.delete(`/races/${race.id}/results`)
        setSuccess('Timing data cleared.')
      } else if (confirm.type === 'clearAssignments') {
        await api.delete(`/races/${race.id}/assignments`)
        setSuccess('Assignments and timing data cleared.')
      } else if (confirm.type === 'deleteTeam') {
        await api.delete(`/teams/${confirm.team.id}`)
        await loadTeams(race.id)
        setSuccess(`${confirm.team.name} deleted.`)
      } else if (confirm.type === 'wipeAll') {
        await api.delete(`/races/${race.id}`)
        onRaceWipe()
        return
      }
      setConfirm(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setError('Operation failed — check your connection.')
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  if (!race) {
    return (
      <p className="text-gray-500 py-10 text-center text-sm">
        Create a race first before using reset controls.
      </p>
    )
  }

  return (
    <div className="py-4 flex flex-col gap-6">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-emerald-400 text-sm">{success}</p>}

      {/* Clear timing data */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Clear Timing Data</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes all recorded leg times. Teams, members, and assignments are preserved — the race can be re-run without reconfiguring anything.
        </p>
        <button
          onClick={() => openConfirm({ type: 'clearResults' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Clear Results
        </button>
      </div>

      {/* Clear assignments */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Clear Assignments</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes all leg assignments for every team. Timing data is also cleared since it depends on assignments. Teams are unlocked so assignments can be re-entered.
        </p>
        <button
          onClick={() => openConfirm({ type: 'clearAssignments' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Clear Assignments
        </button>
      </div>

      {/* Delete a team */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Delete a Team</p>
        <p className="text-gray-400 text-sm mb-4">
          Permanently removes a team and all its members, assignments, and recorded times.
        </p>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-600 text-sm">No teams.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-800">
            {teams.map(team => (
              <div key={team.id} className="flex items-center justify-between py-2.5">
                <span className="text-white text-sm">{team.name}</span>
                <button
                  onClick={() => openConfirm({ type: 'deleteTeam', team })}
                  className="text-red-400 hover:text-red-300 text-sm min-h-[44px] px-2 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wipe everything */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Wipe Everything</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes this race and all data under it — legs, handoffs, teams, members, assignments, and results. The app returns to the empty state.
        </p>
        <button
          onClick={() => openConfirm({ type: 'wipeAll' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Wipe Everything
        </button>
      </div>

      {/* Confirm dialogs */}
      {confirm?.type === 'clearResults' && (
        <ConfirmDialog
          title="Clear Results"
          message={`Clear all leg results for ${race.name}? The race can be re-run but all recorded times will be lost.`}
          confirmLabel={busy ? 'Clearing…' : 'Clear Results'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'clearAssignments' && (
        <ConfirmDialog
          title="Clear Assignments"
          message={`Clear all assignments for ${race.name}? Timing data will also be deleted. Teams will be unlocked.`}
          confirmLabel={busy ? 'Clearing…' : 'Clear Assignments'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'deleteTeam' && (
        <ConfirmDialog
          title="Delete Team"
          message={`Delete ${confirm.team.name}? This removes the team, all members, assignments, and recorded times permanently.`}
          confirmLabel={busy ? 'Deleting…' : 'Delete Team'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'wipeAll' && (
        <ConfirmDialog
          title="Wipe Everything"
          message={`Delete ${race.name} and all data? This cannot be undone.`}
          confirmLabel={busy ? 'Wiping…' : 'Wipe Everything'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
