import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { TabNav } from './components/TabNav'
import { RaceTab } from './tabs/RaceTab'
import { LegsTab } from './tabs/LegsTab'
import { TeamsTab } from './tabs/TeamsTab'
import { PASSWORD_KEY } from './api'
import type { Race } from '@kt82/shared'

type Tab = 'race' | 'legs' | 'teams'

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(PASSWORD_KEY))
  const [tab, setTab] = useState<Tab>('race')
  const [race, setRace] = useState<Race | null>(null)

  function handle401() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
  }

  function handleSignOut() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TabNav tab={tab} onTab={setTab} onSignOut={handleSignOut} />
      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'race' && <RaceTab onRaceChange={setRace} on401={handle401} />}
        {tab === 'legs' && <LegsTab race={race} on401={handle401} />}
        {tab === 'teams' && <TeamsTab race={race} on401={handle401} />}
      </div>
    </div>
  )
}
