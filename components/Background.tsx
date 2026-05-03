export default function Background() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {/* Glow beam from top center — lights up the nav and fades down */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '70%',
        height: '380px',
        background: 'radial-gradient(ellipse 50% 100% at 50% 0%, var(--glow) 0%, transparent 100%)',
      }} />
    </div>
  )
}
