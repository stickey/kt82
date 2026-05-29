type Tab = 'race' | 'legs' | 'teams' | 'danger'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onSignOut: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'race', label: 'Race' },
  { id: 'legs', label: 'Legs' },
  { id: 'teams', label: 'Teams' },
  { id: 'danger', label: 'Danger' },
]

export function TabNav({ tab, onTab, onSignOut }: Props) {
  return (
    <div className="bg-gray-900 border-b border-gray-800">
      {/* Mobile: title row above tabs */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="font-bold text-white text-base">KT82 Manager</span>
        <button onClick={onSignOut} className="text-gray-400 text-sm hover:text-white">Sign out</button>
      </div>
      {/* Tab row */}
      <div className="flex items-stretch">
        {/* Desktop: title inline with tabs */}
        <div className="hidden md:flex items-center px-4 pr-6 font-bold text-white whitespace-nowrap border-r border-gray-800 text-sm">
          KT82 Manager
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex-1 md:flex-none py-3 px-5 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              tab === t.id
                ? t.id === 'danger'
                  ? 'border-red-500 text-red-400'
                  : 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        {/* Desktop: sign out right-aligned */}
        <div className="hidden md:flex items-center ml-auto px-4">
          <button onClick={onSignOut} className="text-gray-500 text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
