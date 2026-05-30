import { useState, useEffect } from 'react'
import { api, getStoredPins, storePin } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Team } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

type ModalState =
  | { type: 'addTeam' }
  | { type: 'renameTeam'; team: Team }
  | { type: 'resetTeam'; team: Team }
  | { type: 'exportPins' }

export function TeamsTab({ race, on401 }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [addForm, setAddForm] = useState({ name: '', pin: '' })
  const [renameForm, setRenameForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pins, setPins] = useState<Record<string, string>>(getStoredPins)

  useEffect(() => {
    if (race) load(race.id)
    else setTeams([])
  }, [race?.id])

  async function load(raceId: string) {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Team[]>(`/races/${raceId}/teams`)
      setTeams(data)
      setPins(getStoredPins())
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTeam() {
    const pinVal = addForm.pin.trim()
    if (!addForm.name.trim()) { setFormError('Team name is required'); return }
    if (!/^\d{4,6}$/.test(pinVal)) { setFormError('PIN must be 4–6 digits'); return }
    setSaving(true)
    setFormError('')
    try {
      const created = await api.post<Team & { pin: string }>(`/races/${race!.id}/teams`, {
        name: addForm.name.trim(),
        pin: pinVal,
      })
      storePin(created.id, created.pin)
      setPins(getStoredPins())
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename() {
    if (modal?.type !== 'renameTeam') return
    if (!renameForm.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      await api.put(`/teams/${modal.team.id}`, { name: renameForm.name.trim() })
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to rename team')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (modal?.type !== 'resetTeam') return
    setSaving(true)
    try {
      await api.post(`/teams/${modal.team.id}/reset`, {})
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      else setFormError('Failed to reset team')
    } finally {
      setSaving(false)
    }
  }

  function statusBadge(team: Team) {
    if (team.locked) {
      return <span className="bg-emerald-950 text-emerald-400 text-xs font-medium rounded px-2 py-0.5">Locked</span>
    }
    return <span className="border border-gray-700 text-gray-400 text-xs font-medium rounded px-2 py-0.5">Unlocked</span>
  }

  if (!race) return <p className="text-gray-500 py-10 text-center text-sm">Create a race first.</p>
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
        </p>
        <div className="flex gap-2">
          {teams.length > 0 && (
            <button
              onClick={() => setModal({ type: 'exportPins' })}
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
            >
              Export PINs
            </button>
          )}
          <button
            onClick={() => { setAddForm({ name: '', pin: '' }); setFormError(''); setModal({ type: 'addTeam' }) }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
          >
            + Add Team
          </button>
        </div>
      </div>

      {teams.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No teams yet</p>
        </div>
      )}

      {/* Desktop table */}
      {teams.length > 0 && (
        <div className="hidden md:block bg-gray-900 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_120px] px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <span>Team</span>
            <span>PIN</span>
            <span>Status</span>
          </div>
          {teams.map((team, i) => (
            <div
              key={team.id}
              className={`grid grid-cols-[1fr_80px_120px] px-4 py-3 items-center ${i < teams.length - 1 ? 'border-b border-gray-800' : ''}`}
            >
              <div>
                <span className="text-white text-sm font-medium">{team.name}</span>
                <span className="ml-3 text-xs">
                  <button onClick={() => { setRenameForm({ name: team.name }); setFormError(''); setModal({ type: 'renameTeam', team }) }}
                    className="text-blue-400 hover:text-blue-300">Rename</button>
                  <span className="text-gray-700 mx-1">·</span>
                  <button onClick={() => setModal({ type: 'resetTeam', team })}
                    className="text-amber-400 hover:text-amber-300">Reset</button>
                </span>
              </div>
              <span className="text-white text-sm font-mono">{pins[team.id] ?? '—'}</span>
              <div>{statusBadge(team)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile cards */}
      {teams.length > 0 && (
        <div className="md:hidden flex flex-col gap-2">
          {teams.map(team => (
            <div key={team.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-white font-semibold text-base">{team.name}</span>
                {statusBadge(team)}
              </div>
              <div className="flex gap-4 text-xs text-gray-400 mb-3">
                <span>PIN: <span className="text-white font-mono">{pins[team.id] ?? '—'}</span></span>
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => { setRenameForm({ name: team.name }); setFormError(''); setModal({ type: 'renameTeam', team }) }}
                  className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center"
                >
                  Rename
                </button>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => setModal({ type: 'resetTeam', team })}
                  className="text-amber-400 hover:text-amber-300 min-h-[44px] flex items-center"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add team modal */}
      {modal?.type === 'addTeam' && (
        <Modal title="Add Team" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Team name</span>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Team Alpha"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">PIN <span className="text-gray-600">(4–6 digits)</span></span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={addForm.pin}
                onChange={e => setAddForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="1234"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleAddTeam}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename modal */}
      {modal?.type === 'renameTeam' && (
        <Modal title="Rename Team" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">New name</span>
              <input
                type="text"
                value={renameForm.name}
                onChange={e => setRenameForm({ name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleRename}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reset confirm */}
      {modal?.type === 'resetTeam' && (
        <ConfirmDialog
          title="Reset Team"
          message={`Reset ${modal.team.name}? This will delete all leg assignments and unlock the team. Race results are also cleared.`}
          confirmLabel="Reset"
          onConfirm={handleReset}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Export PINs modal */}
      {modal?.type === 'exportPins' && (
        <Modal title="Team PINs" onClose={() => setModal(null)}>
          <div className="mb-4">
            <table className="w-full text-sm">
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-2.5 text-white">{team.name}</td>
                    <td className="py-2.5 text-right font-mono text-white">{pins[team.id] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 text-xs mt-3">PINs marked — were not created on this device.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Close</button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Print
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
