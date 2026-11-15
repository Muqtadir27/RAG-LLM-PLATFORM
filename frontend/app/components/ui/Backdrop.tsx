/** Decorative background: two slow-moving colour washes and a faint dot grid. Pure CSS, so it costs no JS or battery. */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-40 -top-48 h-[620px] w-[620px] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(45 212 238 / 0.13), transparent 68%)', animation: 'drift-a 22s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute -bottom-56 -right-40 h-[680px] w-[680px] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(139 140 248 / 0.14), transparent 68%)', animation: 'drift-b 26s ease-in-out infinite alternate' }}
      />
      <div className="dot-grid absolute inset-0" />
      <style>{`
        @keyframes drift-a { to { transform: translate(90px, 70px) scale(1.12); } }
        @keyframes drift-b { to { transform: translate(-80px, -60px) scale(1.1); } }
        @media (prefers-reduced-motion: reduce) { [style*="drift-"] { animation: none !important; } }
      `}</style>
    </div>
  )
}
