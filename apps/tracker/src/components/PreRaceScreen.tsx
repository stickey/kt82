import type { LegTimelineItem } from '../api'

interface Props {
  teamName: string
  assignedStartTime: Date
  timeline: LegTimelineItem[]
  onBack: () => void
}

export function PreRaceScreen({ teamName, onBack }: Props) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh', padding: '52px 18px 18px' }}>
      <button
        onClick={onBack}
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mut)',
          background: 'none', border: 'none', cursor: 'pointer', minHeight: 44,
          display: 'flex', alignItems: 'center', marginBottom: 16,
        }}
      >
        ← All Teams
      </button>
      <p style={{ color: 'var(--mut)' }}>{teamName} — Pre-Race (building…)</p>
    </div>
  )
}
