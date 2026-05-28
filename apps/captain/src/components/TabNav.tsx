type Tab = 'roster' | 'assignments'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onSignOut: () => void
  teamName?: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'assignments', label: 'Assignments' },
]

export function TabNav({ tab, onTab, onSignOut, teamName }: Props) {
  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="font-bold text-white text-base">{teamName ?? 'KT82 Captain'}</span>
        <button onClick={onSignOut} className="text-gray-400 text-sm hover:text-white">Sign out</button>
      </div>
      <div className="flex items-stretch">
        <div className="hidden md:flex items-center px-4 pr-6 font-bold text-white whitespace-nowrap border-r border-gray-800 text-sm">
          {teamName ?? 'KT82 Captain'}
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex-1 md:flex-none py-3 px-5 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="hidden md:flex items-center ml-auto px-4">
          <button onClick={onSignOut} className="text-gray-500 text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
