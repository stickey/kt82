import { useState, useEffect } from 'react'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Leg, Handoff } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

type LegForm = { legNumber: string; name: string; distanceMiles: string }
type HandoffForm = { name: string; address: string; lat: string; lng: string }
type ModalState =
  | { type: 'addLeg' }
  | { type: 'editLeg'; leg: Leg }
  | { type: 'deleteLeg'; leg: Leg }
  | { type: 'addHandoff'; leg: Leg }
  | { type: 'editHandoff'; leg: Leg; handoff: Handoff }

export function LegsTab({ race, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState | null>(null)
  const [legForm, setLegForm] = useState<LegForm>({ legNumber: '', name: '', distanceMiles: '' })
  const [handoffForm, setHandoffForm] = useState<HandoffForm>({ name: '', address: '', lat: '', lng: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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

  function openAddLeg() {
    const nextNum = legs.length > 0 ? Math.max(...legs.map(l => l.legNumber)) + 1 : 1
    setLegForm({ legNumber: String(nextNum), name: '', distanceMiles: '' })
    setFormError('')
    setModal({ type: 'addLeg' })
  }

  function openEditLeg(leg: Leg) {
    setLegForm({ legNumber: String(leg.legNumber), name: leg.name, distanceMiles: String(leg.distanceMiles) })
    setFormError('')
    setModal({ type: 'editLeg', leg })
  }

  function openDeleteLeg(leg: Leg) {
    setModal({ type: 'deleteLeg', leg })
  }

  function openHandoff(leg: Leg) {
    if (leg.handoff) {
      setHandoffForm({
        name: leg.handoff.name,
        address: leg.handoff.address ?? '',
        lat: leg.handoff.lat != null ? String(leg.handoff.lat) : '',
        lng: leg.handoff.lng != null ? String(leg.handoff.lng) : '',
      })
      setModal({ type: 'editHandoff', leg, handoff: leg.handoff })
    } else {
      setHandoffForm({ name: '', address: '', lat: '', lng: '' })
      setModal({ type: 'addHandoff', leg })
    }
    setFormError('')
  }

  async function saveLeg() {
    const num = parseInt(legForm.legNumber)
    const dist = parseFloat(legForm.distanceMiles)
    if (!legForm.name.trim() || isNaN(num) || num < 1 || isNaN(dist) || dist <= 0) {
      setFormError('Leg number (≥1), name, and distance (>0) are required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal?.type === 'addLeg') {
        await api.post(`/races/${race!.id}/legs`, {
          legNumber: num, name: legForm.name.trim(), distanceMiles: dist,
        })
      } else if (modal?.type === 'editLeg') {
        await api.put(`/legs/${modal.leg.id}`, {
          legNumber: num, name: legForm.name.trim(), distanceMiles: dist,
        })
      }
      setModal(null)
      await load(race!.id)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save leg')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLeg() {
    if (modal?.type !== 'deleteLeg') return
    setSaving(true)
    try {
      await api.delete(`/legs/${modal.leg.id}`)
      setModal(null)
      await load(race!.id)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  async function saveHandoff() {
    if (!handoffForm.name.trim()) { setFormError('Handoff name is required'); return }
    const lat = handoffForm.lat ? parseFloat(handoffForm.lat) : null
    const lng = handoffForm.lng ? parseFloat(handoffForm.lng) : null
    if (handoffForm.lat && isNaN(lat!)) { setFormError('Latitude must be a number'); return }
    if (handoffForm.lng && isNaN(lng!)) { setFormError('Longitude must be a number'); return }
    setSaving(true)
    setFormError('')
    const body = {
      name: handoffForm.name.trim(),
      address: handoffForm.address.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
    }
    try {
      if (modal?.type === 'addHandoff') {
        await api.post(`/legs/${modal.leg.id}/handoff`, body)
      } else if (modal?.type === 'editHandoff') {
        await api.put(`/handoffs/${modal.handoff.id}`, body)
      }
      setModal(null)
      await load(race!.id)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save handoff')
    } finally {
      setSaving(false)
    }
  }

  if (!race) return <p className="text-gray-500 py-10 text-center text-sm">Create a race first.</p>
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
        </p>
        <button
          onClick={openAddLeg}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
        >
          + Add Leg
        </button>
      </div>

      {legs.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No legs yet</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const open = expanded.has(leg.id)
          return (
            <div key={leg.id} className="bg-gray-900 rounded-xl overflow-hidden">
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
                  {!leg.handoff && <span className="text-amber-400 text-xs">No handoff</span>}
                  <button
                    onClick={e => { e.stopPropagation(); openEditLeg(leg) }}
                    className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openDeleteLeg(leg) }}
                    className="text-red-400 hover:text-red-300 text-xs min-h-[44px] px-1"
                  >
                    Delete
                  </button>
                  <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {open && (
                <div className="border-t border-gray-800 px-4 py-3 pl-[52px] bg-gray-950/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Handoff Point</p>
                  {leg.handoff ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">{leg.handoff.name}</p>
                        {leg.handoff.address && (
                          <p className="text-gray-400 text-xs mt-0.5">{leg.handoff.address}</p>
                        )}
                        {(leg.handoff.lat != null || leg.handoff.lng != null) && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {leg.handoff.lat}°, {leg.handoff.lng}°
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openHandoff(leg)}
                        className="text-blue-400 hover:text-blue-300 text-xs shrink-0 min-h-[44px] flex items-center"
                      >
                        Edit handoff
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-500 text-sm">No handoff set</p>
                      <button
                        onClick={() => openHandoff(leg)}
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

      {/* Leg modal */}
      {(modal?.type === 'addLeg' || modal?.type === 'editLeg') && (
        <Modal title={modal.type === 'addLeg' ? 'Add Leg' : 'Edit Leg'} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <label className="block w-24 shrink-0">
                <span className="text-sm text-gray-400 block mb-1">Leg #</span>
                <input
                  type="number"
                  min="1"
                  value={legForm.legNumber}
                  onChange={e => setLegForm(f => ({ ...f, legNumber: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Distance (miles)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={legForm.distanceMiles}
                  onChange={e => setLegForm(f => ({ ...f, distanceMiles: e.target.value }))}
                  placeholder="4.2"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Leg name</span>
              <input
                type="text"
                value={legForm.name}
                onChange={e => setLegForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Hartsburg"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={saveLeg}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Handoff modal */}
      {(modal?.type === 'addHandoff' || modal?.type === 'editHandoff') && (
        <Modal
          title={modal.type === 'addHandoff' ? `Add Handoff — Leg ${modal.leg.legNumber}` : `Edit Handoff — Leg ${modal.leg.legNumber}`}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Handoff name <span className="text-gray-600">(required)</span></span>
              <input
                type="text"
                value={handoffForm.name}
                onChange={e => setHandoffForm(f => ({ ...f, name: e.target.value }))}
                placeholder="McBaine Trailhead"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Address <span className="text-gray-600">(optional)</span></span>
              <input
                type="text"
                value={handoffForm.address}
                onChange={e => setHandoffForm(f => ({ ...f, address: e.target.value }))}
                placeholder="1234 County Rd, McBaine, MO"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Latitude <span className="text-gray-600">(optional)</span></span>
                <input
                  type="number"
                  step="any"
                  value={handoffForm.lat}
                  onChange={e => setHandoffForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="38.834"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Longitude <span className="text-gray-600">(optional)</span></span>
                <input
                  type="number"
                  step="any"
                  value={handoffForm.lng}
                  onChange={e => setHandoffForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="-92.452"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={saveHandoff}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete leg confirm */}
      {modal?.type === 'deleteLeg' && (
        <ConfirmDialog
          title="Delete Leg"
          message={`Delete Leg ${modal.leg.legNumber} — ${modal.leg.name}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteLeg}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
