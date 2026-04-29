export function LiveBadge() {
  return (
    <span
      aria-label="live"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 500,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.78)',
        padding: '5px 11px 5px 9px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999,
      }}
    >
      <span style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
        <span
          style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'var(--emerald-glow)',
            boxShadow: '0 0 10px rgba(109,219,155,0.95)',
          }}
          aria-hidden="true"
        />
        <span
          className="live-dot-ring"
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--emerald-glow)' }}
          aria-hidden="true"
        />
      </span>
      live
    </span>
  )
}
