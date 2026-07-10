export function JustinBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
      borderBottom: '1px solid var(--accent)',
      padding: '10px 18px',
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: 'var(--accent)',
      textAlign: 'center',
    }}>
      Boo, Hiss!!
    </div>
  )
}
