export default function Background() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(760px, 92vw)',
        height: '310px',
        background: 'radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,255,255,0.34) 0%, var(--glow) 34%, transparent 82%)',
        opacity: 0.95,
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 18%, transparent 0%, transparent 42%, rgba(0,0,0,0.22) 100%)',
        mixBlendMode: 'multiply',
      }} />
    </div>
  )
}
