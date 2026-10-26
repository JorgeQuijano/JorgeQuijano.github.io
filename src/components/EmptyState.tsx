import { RotateCcw, SearchX } from "lucide-react";

export default function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="panel flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center border border-line bg-panel-2 text-dim">
        <SearchX size={20} strokeWidth={1.6} />
      </div>
      <h2 className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-ink">
        No projects match those filters.
      </h2>
      <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-muted">
        Try a different search, language, or category. The full index is only a
        reset away.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-2 border border-line px-3 py-2 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:border-amber hover:text-amber"
      >
        <RotateCcw size={12} />
        Reset filters
      </button>
    </div>
  );
}
