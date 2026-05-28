type Tab = 'race' | 'legs' | 'teams'
interface Props { tab: Tab; onTab: (t: Tab) => void; onSignOut: () => void }
export function TabNav(_props: Props) { return null }
