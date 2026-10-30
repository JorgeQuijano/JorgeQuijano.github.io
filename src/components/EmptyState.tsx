export default function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="panel flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-[11px] text-accent">$ grep --projects</p>
      <h2 className="mt-3 text-[18px] font-medium tracking-[-0.02em] text-ink">
        No matches.
      </h2>
      <p className="mt-2 max-w-sm text-[12px] leading-[1.8] text-muted">
        <span className="text-dim"># </span>Try a different search, language,
        or category. The full index is one reset away.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 border border-line px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-muted hover:border-accent hover:text-accent"
      >
        [ reset --filters ]
      </button>
    </div>
  );
}
