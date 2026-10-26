import type { RefObject } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { classNames } from "../lib/format";

type FilterPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  categoryCounts: Record<string, number>;
  language: string;
  onLanguageChange: (value: string) => void;
  languages: string[];
  sort: string;
  onSortChange: (value: string) => void;
  total: number;
  filtered: number;
  active: boolean;
  onReset: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
};

export default function FilterPanel({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  categoryCounts,
  language,
  onLanguageChange,
  languages,
  sort,
  onSortChange,
  total,
  filtered,
  active,
  onReset,
  searchRef,
}: FilterPanelProps) {
  const chips = ["All", "Featured", ...categories];

  return (
    <section
      className="panel p-3 sm:p-4"
      aria-label="Search and filter projects"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="field flex h-10 flex-1 items-center gap-2 px-3">
          <Search size={14} strokeWidth={1.8} className="shrink-0 text-dim" />
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            ref={searchRef}
            id="project-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search projects, tools, topics…"
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full border-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-dim"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="grid h-6 w-6 shrink-0 place-items-center text-dim hover:text-ink"
            >
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden shrink-0 border border-line px-1.5 py-0.5 font-mono text-[9px] text-dim sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0">
          <label className="sr-only" htmlFor="language-filter">
            Filter by language
          </label>
          <select
            id="language-filter"
            value={language}
            onChange={(event) => onLanguageChange(event.target.value)}
            className="select-field h-10 px-3 pr-8"
          >
            <option value="All">All languages</option>
            {languages.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="sort-order">
            Sort projects
          </label>
          <select
            id="sort-order"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="select-field h-10 px-3 pr-8"
          >
            <option value="recent">Recently updated</option>
            <option value="name">Name A–Z</option>
            <option value="added">Recently added</option>
          </select>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {chips.map((chip) => {
          const count = categoryCounts[chip] ?? 0;
          const isActive = category === chip;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onCategoryChange(chip)}
              data-active={isActive}
              aria-pressed={isActive}
              className="chip"
            >
              {chip}
              <span
                className={classNames(
                  "tabular text-[8px]",
                  isActive ? "text-amber/70" : "text-dim",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p
          className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted"
          aria-live="polite"
        >
          Showing <span className="text-ink">{filtered}</span> of {total} projects
        </p>

        {active && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-amber"
          >
            <RotateCcw size={11} />
            Reset filters
          </button>
        )}
      </div>
    </section>
  );
}
