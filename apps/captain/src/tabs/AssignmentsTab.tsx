import { useState, useEffect } from 'react'
import { api, getTeamId, deleteWithBody } from '../api'
import { Modal } from '../components/Modal'
import type { TeamDetail, TeamMember, Leg, LegAssignment } from '@kt82/shared'

interface Props {
  teamDetail: TeamDetail | null
  on401: () => void
}

type AssignmentDetail = LegAssignment & { teamMember: TeamMember }

function parsePace(input: string): number | null {
  const m = input.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const mins = parseInt(m[1])
  const secs = parseInt(m[2])
  if (secs > 59 || mins < 1) return null
  return mins * 60 + secs
}

function formatPace(secPerMile: number): string {
  const mins = Math.floor(secPerMile / 60)
  const secs = secPerMile % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AssignmentsTab({ teamDetail, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [members, setMembers] = useState<TeamMember[]>(teamDetail?.members ?? [])
  const [assignments, setAssignments] = useState<AssignmentDetail[]>(
    (teamDetail?.assignments ?? []).map(a => ({ ...a, teamMember: a.teamMember }))
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<{ leg: Leg; assignment: AssignmentDetail | null } | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [paceInput, setPaceInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const teamId = getTeamId()!
      const [detail, legsData] = await Promise.all([
        api.get<TeamDetail>(`/teams/${teamId}`),
        api.get<Leg[]>(`/teams/${teamId}/legs`),
      ])
      setMembers(detail.members)
      setAssignments(detail.assignments.map(a => ({ ...a, teamMember: a.teamMember })))
      setLegs(legsData)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function openModal(leg: Leg) {
    const assignment = assignments.find(a => a.legId === leg.id) ?? null
    setModal({ leg, assignment })
    setSelectedMemberId(assignment?.teamMemberId ?? '')
    setPaceInput(assignment ? formatPace(assignment.targetPaceSecPerMile) : '')
    setFormError('')
  }

  async function handleSave() {
    if (!selectedMemberId) { setFormError('Select a runner'); return }
    const pace = parsePace(paceInput)
    if (pace === null) { setFormError('Enter pace as M:SS (e.g. 8:30)'); return }
    setSaving(true)
    setFormError('')
    const teamId = getTeamId()!
    try {
      if (modal!.assignment) {
        await api.put(`/assignments/${modal!.assignment.id}`, {
          teamId,
          teamMemberId: selectedMemberId,
          targetPaceSecPerMile: pace,
        })
      } else {
        await api.post(`/teams/${teamId}/assignments`, {
          legId: modal!.leg.id,
          teamMemberId: selectedMemberId,
          targetPaceSecPerMile: pace,
        })
      }
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!modal?.assignment) return
    setSaving(true)
    const teamId = getTeamId()!
    try {
      await deleteWithBody(`/assignments/${modal.assignment.id}`, { teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to remove — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  if (legs.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500 text-sm">No legs configured yet.</p>
        <p className="text-gray-600 text-xs mt-1">Ask the race manager to set up the course.</p>
      </div>
    )
  }

  const assignmentMap = new Map(assignments.map(a => [a.legId, a]))
  const assignedCount = legs.filter(l => assignmentMap.has(l.id)).length

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {assignedCount} / {legs.length} assigned
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const assignment = assignmentMap.get(leg.id) ?? null
          return (
            <div
              key={leg.id}
              className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors min-h-[56px]"
              onClick={() => openModal(leg)}
            >
              <div className="min-w-0 flex-1">
                <span className="text-white font-medium text-sm">#{leg.legNumber} · {leg.name}</span>
                <span className="text-gray-400 text-xs ml-2">{leg.distanceMiles} mi</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                {assignment ? (
                  <div>
                    <span className="text-white text-sm block">{assignment.teamMember.name}</span>
                    <span className="text-gray-400 text-xs">{formatPace(assignment.targetPaceSecPerMile)}/mi</span>
                  </div>
                ) : (
                  <span className="text-amber-400 text-xs">Unassigned</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal
          title={`Leg ${modal.leg.legNumber} — ${modal.leg.name}`}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            {members.length === 0 ? (
              <p className="text-gray-400 text-sm">Add runners on the Roster tab first.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Runner</p>
                  <div className="flex flex-col gap-1.5">
                    {members.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          selectedMemberId === member.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm text-gray-400 block mb-1">Target pace (min/mile)</span>
                  <input
                    type="text"
                    value={paceInput}
                    onChange={e => setPaceInput(e.target.value)}
                    placeholder="8:30"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </label>
                {formError && <p className="text-red-400 text-sm">{formError}</p>}
                <div className="flex items-center justify-between pt-1">
                  {modal.assignment ? (
                    <button
                      onClick={handleRemove}
                      disabled={saving}
                      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove assignment
                    </button>
                  ) : <span />}
                  <div className="flex gap-3">
                    <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
