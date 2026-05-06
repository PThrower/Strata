export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
    } as React.CSSProperties}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 70%, rgba(0,196,114,0.05) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderTopColor: 'rgba(255,255,255,0.28)',
        borderLeftColor: 'rgba(255,255,255,0.20)',
        borderRadius: 22,
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.30), inset 1px 0 0 0 rgba(255,255,255,0.14), 0 24px 60px -24px rgba(0,0,0,0.7)',
        padding: '36px 28px',
        color: 'var(--ink)',
      } as React.CSSProperties}>
        {children}
      </div>
    </div>
  )
}
