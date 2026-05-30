import { useState, useEffect } from 'react'
import { api } from '../api'
import { Modal } from '../components/Modal'
import type { Race } from '@kt82/shared'

interface Props {
  onRaceChange: (race: Race | null) => void
  on401: () => void
}

type Form = { name: string; date: string }

export function RaceTab({ onRaceChange, on401 }: Props) {
  const [race, setRace] = useState<Race | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Form>({ name: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const races = await api.get<Race[]>('/races')
      const r = races[0] ?? null
      setRace(r)
      onRaceChange(r)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm({ name: '', date: '' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit() {
    if (!race) return
    setForm({ name: race.name, date: new Date(race.date).toISOString().slice(0, 10) })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.date) {
      setFormError('Race name and date are required')
      return
    }
    const isoDate = new Date(form.date + 'T12:00:00').toISOString()
    setSaving(true)
    setFormError('')
    try {
      let updated: Race
      if (race) {
        updated = await api.put<Race>(`/races/${race.id}`, { name: form.name.trim(), date: isoDate })
      } else {
        updated = await api.post<Race>('/races', { name: form.name.trim(), date: isoDate })
      }
      setRace(updated)
      onRaceChange(updated)
      setShowModal(false)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Active Race</p>

      {race ? (
        <div className="bg-gray-900 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-white font-semibold text-lg leading-tight">{race.name}</p>
            <p className="text-gray-400 text-sm mt-1">
              {new Date(race.date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <button onClick={openEdit} className="text-blue-400 hover:text-blue-300 text-sm font-medium min-h-[44px] flex items-center">
            Edit
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm mb-3">No race configured yet</p>
          <button onClick={openCreate} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            + Create Race
          </button>
        </div>
      )}

      {showModal && (
        <Modal title={race ? 'Edit Race' : 'Create Race'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Race name</span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="KT82 2026"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Race date</span>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-400 hover:text-white px-3 py-2">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
