import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowUpRight, Code2, Sparkles } from "lucide-react";
import BrandMark from "./components/BrandMark";
import GithubIcon from "./components/GithubIcon";
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
import { useTheme } from "./lib/theme";

type SortOrder = "recent" | "name" | "added";

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

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState<SortOrder>("recent");
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const { choice, resolved } = useTheme();

  const buildTime = import.meta.env.VITE_BUILD_TIME || data.syncedAt;
  const liveCount = data.stats.live;
  const unreachable = data.stats.unreachable.length;
  const operational = unreachable === 0;

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

  const filtersActive =
    query.trim() !== "" ||
    category !== "All" ||
    language !== "All" ||
    sort !== "recent";

  const showFeatured =
    query.trim() === "" &&
    category === "All" &&
    language === "All" &&
    featuredProjects.length > 0;

  const resetFilters = () => {
    setQuery("");
    setCategory("All");
    setLanguage("All");
    setSort("recent");
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
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="Project Index home"
          >
            <BrandMark />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[12px] font-semibold leading-none tracking-[0.1em] text-ink sm:text-[13px] sm:tracking-[0.14em]">
                JORGE<span className="text-amber">QUIJANO</span>
              </span>
              <span className="mt-1 hidden font-mono text-[8px] uppercase leading-none tracking-[0.24em] text-muted sm:block">
                Project Index
              </span>
            </span>
          </a>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <a
              href="https://github.com/JorgeQuijano"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted hover:text-amber sm:flex"
            >
              <GithubIcon size={13} />
              GitHub
              <ArrowUpRight size={10} />
            </a>
            <ThemeSelector />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-line">
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid w-full max-w-[1500px] gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-16 lg:px-8 lg:py-20">
          <div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
              <span className="live-dot" />
              Live from GitHub Pages
              <span className="hidden h-px w-8 bg-line-strong sm:block" />
              <span className="hidden text-dim sm:inline">
                /{data.owner.toLowerCase()}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-balance text-[clamp(3rem,7vw,6.4rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-ink">
              Things I've <span className="text-amber">built.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-muted sm:text-[15px]">
              A living index of my GitHub Pages projects — tools, games,
              references, and experiments. It discovers new pages automatically
              and keeps the list in sync with GitHub.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              <span>
                <strong className="font-medium text-ink">{data.projects.length}</strong>{" "}
                projects
              </span>
              <span className="h-1 w-1 rounded-full bg-line-strong" />
              <span>
                <strong className="font-medium text-ink">{liveCount}</strong> live
              </span>
              <span className="h-1 w-1 rounded-full bg-line-strong" />
              <span>
                <strong className="font-medium text-ink">{categories.length}</strong>{" "}
                categories
              </span>
              <span className="h-1 w-1 rounded-full bg-line-strong" />
              <span title={formatDate(buildTime, "time")}>
                checked {relativeTime(buildTime)}
              </span>
            </div>
          </div>

          <aside className="panel relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="kicker">Index status</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] ${
                  operational ? "text-up" : "text-amber"
                }`}
              >
                <span
                  className="status-dot"
                  data-tone={operational ? undefined : "warn"}
                />
                {operational ? "Operational" : "Degraded"}
              </span>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <div className="px-4 py-4">
                <span className="kicker">Live pages</span>
                <div className="mt-2 font-mono text-[2.4rem] leading-none tracking-[-0.06em] text-ink">
                  {liveCount.toString().padStart(2, "0")}
                </div>
              </div>
              <div className="px-4 py-4">
                <span className="kicker">Categories</span>
                <div className="mt-2 font-mono text-[2.4rem] leading-none tracking-[-0.06em] text-ink">
                  {categories.length.toString().padStart(2, "0")}
                </div>
              </div>
            </div>

            <dl className="divide-y divide-line font-mono text-[9px] uppercase tracking-[0.08em]">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-dim">Source</dt>
                <dd className="truncate text-muted">github.com/JorgeQuijano</dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-dim">Last build</dt>
                <dd className="text-muted" title={formatDate(buildTime, "time")}>
                  {formatDate(buildTime, "short")}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <dt className="text-dim">Theme</dt>
                <dd className="text-muted">
                  {choice === "system" ? `System → ${resolved}` : resolved}
                </dd>
              </div>
              {unreachable > 0 && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-dim">Skipped</dt>
                  <dd className="text-amber">{unreachable} unreachable</dd>
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
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
          categoryCounts={categoryCounts}
          language={language}
          onLanguageChange={setLanguage}
          languages={languages}
          sort={sort}
          onSortChange={(value) => setSort(value as SortOrder)}
          total={data.projects.length}
          filtered={filtered.length}
          active={filtersActive}
          onReset={resetFilters}
          searchRef={searchRef}
        />

        {showFeatured && (
          <section className="mt-9" aria-labelledby="featured-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="kicker kicker-amber">Selected work</span>
                <h2
                  id="featured-heading"
                  className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink"
                >
                  Featured
                </h2>
              </div>
              <span className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-dim sm:flex">
                <Sparkles size={11} />
                Curated
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="kicker">
                {filtersActive ? "Filtered view" : "Complete index"}
              </span>
              <h2
                id="all-projects-heading"
                className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink"
              >
                {filtersActive ? "Results" : "All projects"}
              </h2>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-dim">
              {filtered.length} shown
            </span>
          </div>

          <div className="mt-4">
            {filtered.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
              <span className="font-mono text-[11px] font-semibold tracking-[0.16em] text-ink">
                JORGE<span className="text-amber">QUIJANO</span>
              </span>
            </div>
            <p className="mt-3 max-w-xl text-[11px] leading-relaxed text-muted">
              A live index of things I've built and shipped on GitHub Pages. The
              list is generated from the GitHub API, committed to the repo, and
              deployed as a static site.
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
              Data {formatDate(data.syncedAt)} · Build {formatDate(buildTime)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-10">
            <div className="flex flex-col gap-1.5">
              <span className="kicker">Index</span>
              <a href="#projects" className="text-[11px] text-muted hover:text-amber">
                All projects
              </a>
              <a
                href="https://github.com/JorgeQuijano/JorgeQuijano.github.io#how-it-works"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-amber"
              >
                How it works
                <ArrowUpRight size={10} />
              </a>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="kicker">Elsewhere</span>
              <a
                href="https://github.com/JorgeQuijano"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-amber"
              >
                <GithubIcon size={12} />
                GitHub
                <ArrowUpRight size={10} />
              </a>
              <a
                href="https://github.com/JorgeQuijano/JorgeQuijano.github.io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[11px] text-muted hover:text-amber"
              >
                <Code2 size={12} />
                Source
                <ArrowUpRight size={10} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-1 px-4 py-3 font-mono text-[8px] uppercase tracking-[0.1em] text-dim sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>Built with Vite + React · Data from the GitHub REST API</span>
            <span>
              Theme {choice === "system" ? "System" : choice} · {resolved}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
