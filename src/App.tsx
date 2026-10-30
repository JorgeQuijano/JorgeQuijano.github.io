import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import BrandMark from "./components/BrandMark";
import EmptyState from "./components/EmptyState";
import FilterPanel from "./components/FilterPanel";
import ProjectCard from "./components/ProjectCard";
import ThemeSelector from "./components/ThemeSelector";
import {
  categories,
  data,
  featuredProjects,
  languages,
  projectTimestamp,
} from "./lib/data";
import { formatDate, relativeTime } from "./lib/format";
import {
  useFilterState,
  type SortOrder,
} from "./lib/filters";
import { useTheme } from "./lib/theme";

function sortProjects(
  projects: typeof data.projects,
  sort: SortOrder,
  category: string,
) {
  return [...projects].sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "added") {
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (category === "Featured") {
      return a.order - b.order || a.name.localeCompare(b.name);
    }
    return (
      new Date(projectTimestamp(b)).getTime() -
      new Date(projectTimestamp(a)).getTime()
    );
  });
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <span>
      <span className="text-dim" aria-hidden="true">
        [
      </span>
      <strong className="font-medium text-ink">{value}</strong>
      <span className="text-dim" aria-hidden="true">
        ]
      </span>{" "}
      {label}
    </span>
  );
}

export default function App() {
  const {
    filters,
    setFilters,
    resetFilters: resetFilterState,
    active: filtersActive,
  } = useFilterState(categories, languages);
  const { query, category, language, sort } = filters;
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const { choice, resolved } = useTheme();

  const buildTime = import.meta.env.VITE_BUILD_TIME || data.syncedAt;
  const syncFailed = import.meta.env.VITE_SYNC_STATUS === "failure";
  const liveCount = data.stats.live;
  const unreachable = data.stats.unreachable.length;
  const operational = !syncFailed && unreachable === 0;
  const lastCheckedAt = syncFailed ? data.syncedAt : buildTime;
  const resolvedLabel = resolved === "dark" ? "term" : "paper";
  const themeDisplay =
    choice === "system" ? `sys → ${resolvedLabel}` : resolvedLabel;

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: data.projects.length,
      Featured: data.projects.filter((project) => project.featured).length,
    };
    for (const project of data.projects) {
      counts[project.category] = (counts[project.category] ?? 0) + 1;
    }
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const matches = data.projects.filter((project) => {
      if (category === "Featured" && !project.featured) return false;
      if (category !== "All" && category !== "Featured" && project.category !== category)
        return false;
      if (language !== "All" && project.language !== language) return false;
      if (!needle) return true;

      const haystack = [
        project.name,
        project.description,
        project.category,
        project.language ?? "",
        project.slug,
        ...project.topics,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });

    return sortProjects(matches, sort, category);
  }, [deferredQuery, category, language, sort]);

  const showFeatured =
    query.trim() === "" &&
    category === "All" &&
    language === "All" &&
    featuredProjects.length > 0;

  const resetFilters = () => {
    resetFilterState();
    searchRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== "/" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg">
        <div className="mx-auto flex h-14 w-full max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Project Index home"
          >
            <BrandMark className="h-7 w-7" />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium leading-none tracking-[0.08em] text-ink sm:text-[13px] sm:tracking-[0.1em]">
                JORGE<span className="text-accent">@GITHUB</span>
              </span>
              <span className="mt-1 hidden text-[10px] leading-none tracking-[0.18em] text-muted sm:block">
                ~/project-index
              </span>
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/JorgeQuijano"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-muted hover:text-accent sm:flex"
            >
              github
              <span aria-hidden="true" className="text-dim">
                ↗
              </span>
            </a>
            <ThemeSelector />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted">
              <span className="live-dot" />
              live from github pages
              <span className="hidden h-px w-8 bg-line-strong sm:block" />
              <span className="hidden text-dim sm:inline">
                /{data.owner.toLowerCase()}
              </span>
            </div>

            <p className="prompt mt-6">
              <span className="prompt-user">jorge@github</span>
              <span className="prompt-sep">:</span>
              <span className="prompt-path">~</span>
              <span className="prompt-sep">$</span>
              <span>./index --all</span>
            </p>

            <h1 className="display glow mt-3 max-w-4xl text-balance text-[clamp(2.8rem,7vw,6.2rem)] leading-[0.95] text-ink">
              Things I've <span className="text-accent">built.</span>
              <span className="cursor" aria-hidden="true" />
            </h1>

            <p className="mt-5 max-w-2xl text-[13px] leading-[1.8] text-muted sm:text-[14px]">
              <span className="text-dim"># </span>A living index of my GitHub
              Pages projects — tools, games, references, and experiments. It
              discovers new pages automatically and keeps the list in sync with
              GitHub.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-[10px] uppercase tracking-[0.1em] text-muted">
              <Stat value={data.projects.length} label="projects" />
              <span className="text-line-strong" aria-hidden="true">
                ·
              </span>
              <Stat value={liveCount} label="live" />
              <span className="text-line-strong" aria-hidden="true">
                ·
              </span>
              <Stat value={categories.length} label="categories" />
              <span className="text-line-strong" aria-hidden="true">
                ·
              </span>
              <span title={formatDate(lastCheckedAt, "time")}>
                {syncFailed ? "data from " : "checked "}
                {relativeTime(lastCheckedAt)}
              </span>
            </div>
          </div>

          <aside className="panel relative overflow-hidden">
            <div className="panel-header">
              <span>system status</span>
              <span
                className={`inline-flex items-center gap-1.5 ${
                  operational ? "text-up" : "text-warn"
                }`}
              >
                <span
                  className="status-dot"
                  data-tone={operational ? undefined : "warn"}
                />
                {operational ? "operational" : "degraded"}
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="px-4 py-4">
                <span className="kicker">live pages</span>
                <div className="mt-2 text-[2.4rem] leading-none tracking-[-0.06em] text-ink">
                  {liveCount.toString().padStart(2, "0")}
                </div>
              </div>
              <div className="px-4 py-4">
                <span className="kicker">categories</span>
                <div className="mt-2 text-[2.4rem] leading-none tracking-[-0.06em] text-ink">
                  {categories.length.toString().padStart(2, "0")}
                </div>
              </div>
            </div>

            <dl className="divide-y divide-line text-[10px] uppercase tracking-[0.08em]">
              <div className="flex items-baseline gap-2 px-4 py-2.5">
                <dt className="shrink-0 text-dim">source</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="min-w-0 truncate text-muted">
                  github.com/{data.owner}
                </dd>
              </div>
              <div className="flex items-baseline gap-2 px-4 py-2.5">
                <dt className="shrink-0 text-dim">sync</dt>
                <span className="leader" aria-hidden="true" />
                <dd className={syncFailed ? "text-warn" : "text-up"}>
                  {syncFailed ? "[fail] last good data" : "[ok]"}
                </dd>
              </div>
              <div className="flex items-baseline gap-2 px-4 py-2.5">
                <dt className="shrink-0 text-dim">last build</dt>
                <span className="leader" aria-hidden="true" />
                <dd
                  className="whitespace-nowrap text-muted"
                  title={formatDate(buildTime, "time")}
                >
                  {formatDate(buildTime, "short")}
                </dd>
              </div>
              <div className="flex items-baseline gap-2 px-4 py-2.5">
                <dt className="shrink-0 text-dim">theme</dt>
                <span className="leader" aria-hidden="true" />
                <dd className="whitespace-nowrap text-muted">{themeDisplay}</dd>
              </div>
              {unreachable > 0 && (
                <div className="flex items-baseline gap-2 px-4 py-2.5">
                  <dt className="shrink-0 text-dim">offline</dt>
                  <span className="leader" aria-hidden="true" />
                  <dd className="whitespace-nowrap text-warn">
                    [{unreachable}] unreachable
                  </dd>
                </div>
              )}
            </dl>
          </aside>
        </div>
      </section>

      <main
        id="projects"
        className="mx-auto w-full max-w-[1500px] flex-1 scroll-mt-20 px-4 py-8 sm:px-6 sm:py-10 lg:px-8"
      >
        <FilterPanel
          query={query}
          onQueryChange={(value) => setFilters({ query: value })}
          category={category}
          onCategoryChange={(value) => setFilters({ category: value })}
          categories={categories}
          categoryCounts={categoryCounts}
          language={language}
          onLanguageChange={(value) => setFilters({ language: value })}
          languages={languages}
          sort={sort}
          onSortChange={(value) => setFilters({ sort: value as SortOrder })}
          total={data.projects.length}
          filtered={filtered.length}
          active={filtersActive}
          onReset={resetFilters}
          searchRef={searchRef}
        />

        {showFeatured && (
          <section className="mt-9" aria-labelledby="featured-heading">
            <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
              <div>
                <span className="kicker kicker-accent">selected work</span>
                <h2
                  id="featured-heading"
                  className="mt-1 text-[20px] font-medium tracking-[-0.03em] text-ink"
                >
                  Featured
                </h2>
              </div>
              <span className="hidden text-[10px] uppercase tracking-[0.1em] text-dim sm:block">
                [{featuredProjects.length}] curated
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} featured />
              ))}
            </div>
          </section>
        )}

        <section
          className={showFeatured ? "mt-10" : "mt-9"}
          aria-labelledby="all-projects-heading"
        >
          <div className="flex items-end justify-between gap-4 border-b border-line pb-2">
            <div>
              <span className="kicker">
                {filtersActive ? "filtered view" : "complete index"}
              </span>
              <h2
                id="all-projects-heading"
                className="mt-1 text-[20px] font-medium tracking-[-0.03em] text-ink"
              >
                {filtersActive ? "Results" : "All projects"}
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.1em] text-dim">
              [{filtered.length}] shown
            </span>
          </div>

          <div className="mt-4">
            {filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
              </div>
            ) : (
              <EmptyState onReset={resetFilters} />
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-panel">
        <div className="mx-auto grid w-full max-w-[1500px] gap-8 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandMark className="h-7 w-7" />
              <span className="text-[12px] font-medium tracking-[0.12em] text-ink">
                JORGE<span className="text-accent">@GITHUB</span>
              </span>
            </div>
            <p className="mt-3 max-w-xl text-[12px] leading-[1.8] text-muted">
              <span className="text-dim"># </span>A live index of things I've
              built and shipped on GitHub Pages. The list is generated from the
              GitHub API, committed to the repo, and deployed as a static site.
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-dim">
              data {formatDate(data.syncedAt)} · build {formatDate(buildTime)}
              {syncFailed ? " · sync failed" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-10">
            <div className="flex flex-col gap-1.5">
              <span className="kicker">index</span>
              <a
                href="#projects"
                className="text-[11px] text-muted hover:text-accent"
              >
                [all projects]
              </a>
              <a
                href="https://github.com/JorgeQuijano/JorgeQuijano.github.io#how-it-works"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent"
              >
                [how it works]
                <span aria-hidden="true" className="text-dim">
                  ↗
                </span>
              </a>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="kicker">elsewhere</span>
              <a
                href="https://github.com/JorgeQuijano"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent"
              >
                [github]
                <span aria-hidden="true" className="text-dim">
                  ↗
                </span>
              </a>
              <a
                href="https://github.com/JorgeQuijano/JorgeQuijano.github.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-accent"
              >
                [source]
                <span aria-hidden="true" className="text-dim">
                  ↗
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 px-4 py-3 text-[10px] uppercase tracking-[0.1em] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="normal-case tracking-[0.06em]">
              <span className="text-accent">jorge@github</span>
              <span className="text-dim">:</span>~
              <span className="text-dim">$</span> exit 0
            </span>
            <span>
              built with vite + react · data from github rest api · theme{" "}
              {themeDisplay} · EOF
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
