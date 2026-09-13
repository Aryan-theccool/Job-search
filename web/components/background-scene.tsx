// Subtle animated background scene — soft sky/sage/amber blobs that drift
// slowly behind the glass cards. Purely decorative, never intercepts input.
export function BackgroundScene() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="scene-drift absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full opacity-50"
        style={{ background: 'radial-gradient(circle, var(--sky-soft) 0%, transparent 68%)' }}
      />
      <div
        className="scene-drift absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full opacity-45"
        style={{ background: 'radial-gradient(circle, var(--sage-soft) 0%, transparent 68%)', animationDelay: '-8s' }}
      />
      <div
        className="scene-drift absolute -bottom-40 left-1/4 h-[420px] w-[420px] rounded-full opacity-40"
        style={{ background: 'radial-gradient(circle, var(--amber-soft) 0%, transparent 68%)', animationDelay: '-16s' }}
      />
      <div className="paper-texture absolute inset-0" />
    </div>
  );
}
