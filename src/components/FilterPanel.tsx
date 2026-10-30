import type { RefObject } from "react";
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
          <span className="shrink-0 text-[12px] text-accent" aria-hidden="true">
            $
          </span>
          <span
            className="hidden shrink-0 text-[10px] uppercase tracking-[0.08em] text-dim sm:inline"
            aria-hidden="true"
          >
            grep
          </span>
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            ref={searchRef}
            id="project-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="search projects, tools, topics…"
            autoComplete="off"
            spellCheck={false}
            className="h-full w-full min-w-0 border-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-dim"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear search"
              className="shrink-0 text-[10px] text-dim hover:text-accent"
            >
              [x]
            </button>
          ) : (
            <kbd className="hidden shrink-0 border border-line px-1.5 py-0.5 text-[10px] text-dim sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:shrink-0">
          <div className="select-wrap">
            <label className="sr-only" htmlFor="language-filter">
              Filter by language
            </label>
            <span className="select-prefix" aria-hidden="true">
              --lang
            </span>
            <select
              id="language-filter"
              value={language}
              onChange={(event) => onLanguageChange(event.target.value)}
              className="select-field"
            >
              <option value="All">all</option>
              {languages.map((item) => (
                <option key={item} value={item}>
                  {item.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrap">
            <label className="sr-only" htmlFor="sort-order">
              Sort projects
            </label>
            <span className="select-prefix" aria-hidden="true">
              --sort
            </span>
            <select
              id="sort-order"
              value={sort}
              onChange={(event) => onSortChange(event.target.value)}
              className="select-field"
            >
              <option value="recent">recent</option>
              <option value="name">name</option>
              <option value="added">added</option>
            </select>
          </div>
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
              {chip.toLowerCase()}
              <span
                className={classNames(
                  "tabular",
                  isActive ? "text-bg" : "text-dim",
                )}
              >
                {count.toString().padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <p
          className="text-[10px] uppercase tracking-[0.1em] text-muted"
          aria-live="polite"
        >
          <span className="text-accent" aria-hidden="true">
            ▸
          </span>{" "}
          showing <span className="text-ink">{filtered}</span> of {total} projects
        </p>

        {active && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent"
          >
            [ reset --filters ]
          </button>
        )}
      </div>
    </section>
  );
}
