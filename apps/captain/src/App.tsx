import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { TabNav } from './components/TabNav'
import { RosterTab } from './tabs/RosterTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { TEAM_ID_KEY, PIN_KEY } from './api'
import type { TeamDetail } from '@kt82/shared'

type Tab = 'roster' | 'assignments'

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(TEAM_ID_KEY))
  const [tab, setTab] = useState<Tab>('roster')
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null)

  function handle401() {
    localStorage.removeItem(TEAM_ID_KEY)
    localStorage.removeItem(PIN_KEY)
    setAuthed(false)
    setTeamDetail(null)
  }

  function handleSignOut() {
    localStorage.removeItem(TEAM_ID_KEY)
    localStorage.removeItem(PIN_KEY)
    setAuthed(false)
    setTeamDetail(null)
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TabNav tab={tab} onTab={setTab} onSignOut={handleSignOut} teamName={teamDetail?.name} />
      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'roster' && <RosterTab onTeamLoad={setTeamDetail} on401={handle401} />}
        {tab === 'assignments' && <AssignmentsTab teamDetail={teamDetail} on401={handle401} />}
      </div>
    </div>
  )
}
