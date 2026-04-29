interface SectionHeadingProps {
  title: string
  meta?: string
}

export function SectionHeading({ title, meta }: SectionHeadingProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32, gap: 24 }}>
      <h2 style={{
        fontFamily: 'var(--font-serif)',
        fontWeight: 400,
        fontSize: 36,
        lineHeight: 1.08,
        letterSpacing: '-0.02em',
        margin: 0,
        color: 'var(--ink)',
      }}>
        {title}
      </h2>
      {meta && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11.5,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--ink-faint)',
        }}>
          {meta}
        </span>
      )}
    </div>
  )
}
