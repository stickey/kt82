import { useState, useEffect } from 'react'
import { api, getTeamId, deleteWithBody } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { TeamDetail, TeamMember } from '@kt82/shared'

interface Props {
  onTeamLoad: (detail: TeamDetail) => void
  on401: () => void
}

type ModalState =
  | { type: 'add' }
  | { type: 'rename'; member: TeamMember }
  | { type: 'delete'; member: TeamMember }

export function RosterTab({ onTeamLoad, on401 }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [nameForm, setNameForm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const teamId = getTeamId()!
      const detail = await api.get<TeamDetail>(`/teams/${teamId}`)
      setMembers(detail.members)
      onTeamLoad(detail)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!nameForm.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const teamId = getTeamId()!
      await api.post(`/teams/${teamId}/members`, { name: nameForm.trim() })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename() {
    if (modal?.type !== 'rename') return
    if (!nameForm.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const teamId = getTeamId()!
      await api.put(`/members/${modal.member.id}`, { name: nameForm.trim(), teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    setSaving(true)
    try {
      const teamId = getTeamId()!
      await deleteWithBody(`/members/${modal.member.id}`, { teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to delete — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {members.length} {members.length === 1 ? 'Runner' : 'Runners'}
        </p>
        <button
          onClick={() => { setNameForm(''); setFormError(''); setModal({ type: 'add' }) }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[44px]"
        >
          + Add Runner
        </button>
      </div>

      {members.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No runners yet</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {members.map(member => (
          <div key={member.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between min-h-[52px]">
            <span className="text-white font-medium text-sm">{member.name}</span>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => { setNameForm(member.name); setFormError(''); setModal({ type: 'rename', member }) }}
                className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center"
              >
                Rename
              </button>
              <span className="text-gray-700">·</span>
              <button
                onClick={() => { setFormError(''); setModal({ type: 'delete', member }) }}
                className="text-red-400 hover:text-red-300 min-h-[44px] flex items-center"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Runner" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Name</span>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                placeholder="Alice"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'rename' && (
        <Modal title="Rename Runner" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">New name</span>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                autoFocus
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

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Remove Runner"
          message={`Remove ${modal.member.name} from the team? Their leg assignments will also be deleted.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
