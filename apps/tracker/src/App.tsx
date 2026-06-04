import { useState, useEffect } from 'react'
import { api } from './api'
import type { Race, TeamStatus } from './api'
import { TeamGrid } from './components/TeamGrid'
import { TeamDetail } from './components/TeamDetail'

function getHashTeamId(): string | null {
  const m = window.location.hash.match(/^#team\/(.+)$/)
  return m ? m[1] : null
}

export default function App() {
  const [race, setRace] = useState<Race | null>(null)
  const [noRace, setNoRace] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(getHashTeamId)
  const [teamName, setTeamName] = useState('')
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline()  { setIsOnline(true)  }
    function handleOffline() { setIsOnline(false) }
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    api.get<Race>('/races/active')
      .then(setRace)
      .catch(() => setNoRace(true))
  }, [])

  useEffect(() => {
    function onHashChange() { setTeamId(getHashTeamId()) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!race || !teamId || teamName) return
    api.get<TeamStatus[]>(`/races/${race.id}/status`)
      .then(statuses => {
        const found = statuses.find(s => s.team.id === teamId)
        if (found) setTeamName(found.team.name)
      })
      .catch(() => {})
  }, [race, teamId, teamName])

  function navigateToTeam(id: string, name: string) {
    window.location.hash = `team/${id}`
    setTeamId(id)
    setTeamName(name)
  }

  function navigateBack() {
    window.location.hash = ''
    setTeamId(null)
  }

  if (noRace) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)' }}>No active race.</p>
    </div>
  )

  if (!race) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ fontSize: 13, color: 'var(--mut)' }}>Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {!isOnline && (
        <div style={{
          background: 'var(--panel)',
          borderBottom: '1px solid var(--line)',
          padding: '10px 18px',
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--mut)',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          No connection — data may be stale
        </div>
      )}
      {teamId
        ? <TeamDetail teamId={teamId} teamName={teamName} raceDate={race.date} onBack={navigateBack} />
        : <TeamGrid race={race} onTeamClick={navigateToTeam} />
      }
    </div>
  )
}
