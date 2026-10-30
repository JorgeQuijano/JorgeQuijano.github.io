export default function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        fill="var(--panel-2)"
        stroke="var(--line-strong)"
      />
      <path
        d="M6.5 24V13h3.2v11H6.5zm5.7 0V8h3.2v16h-3.2zm5.7 0v-7h3.2v7h-3.2zm5.7 0V5h3.2v19h-3.2z"
        fill="var(--accent)"
      />
    </svg>
  );
}
