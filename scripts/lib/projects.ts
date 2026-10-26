import type { Project, ProjectData, SyncStats } from "../../src/lib/types";

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  has_pages: boolean;
  fork: boolean;
  archived: boolean;
  private: boolean;
  disabled?: boolean;
  is_template?: boolean;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  created_at: string;
  pushed_at: string;
  updated_at: string;
};

export type PageMeta = {
  live: boolean;
  status: number | null;
  title: string | null;
  description: string | null;
  image: string | null;
  deployedAt: string | null;
  error: string | null;
};

export type ProjectOverride = {
  name?: string;
  description?: string;
  category?: string;
  featured?: boolean;
  order?: number;
  hidden?: boolean;
  includeWhenOffline?: boolean;
  url?: string;
  image?: string;
  tags?: string[];
  manual?: boolean;
  repoUrl?: string;
  language?: string | null;
  stars?: number;
};

export type Overrides = Record<string, ProjectOverride>;

export type BuildInput = {
  owner: string;
  repos: GitHubRepo[];
  pages: Map<string, PageMeta>;
  overrides: Overrides;
  now: string;
  aggregatorRepoName?: string;
};

export type BuildResult = {
  data: ProjectData;
  warnings: string[];
  unreachable: string[];
};

const EMPTY_PAGE: PageMeta = {
  live: false,
  status: null,
  title: null,
  description: null,
  image: null,
  deployedAt: null,
  error: "No page metadata",
};

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function decodeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
    mdash: "—",
    ndash: "–",
    hellip: "…",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    copy: "©",
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&([a-z]+);/gi, (match, name: string) => named[name.toLowerCase()] ?? match);
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function titleize(value: string): string {
  return value
    .replace(/[-_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

export function repoPageUrl(owner: string, repoName: string): string {
  return `https://${owner.toLowerCase()}.github.io/${encodeURIComponent(repoName)}/`;
}

function metaContent(
  html: string,
  attribute: "name" | "property",
  value: string,
): string | null {
  const tagPattern = new RegExp(
    `<meta\\b[^>]*\\b${attribute}=["']${escapeRegExp(value)}["'][^>]*>`,
    "i",
  );
  const tag = html.match(tagPattern)?.[0];
  if (!tag) return null;
  const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
  return content ? decodeHtml(content) : null;
}

export function parsePageMeta(
  html: string,
  pageUrl: string,
): Pick<PageMeta, "title" | "description" | "image"> {
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const title = collapseWhitespace(decodeHtml(rawTitle)) || null;

  const description =
    metaContent(html, "name", "description") ??
    metaContent(html, "property", "og:description") ??
    metaContent(html, "name", "twitter:description");

  const rawImage =
    metaContent(html, "property", "og:image") ??
    metaContent(html, "name", "twitter:image");

  let image: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "https:") image = resolved.href;
    } catch {
      image = null;
    }
  }

  return {
    title,
    description: description ? collapseWhitespace(description) : null,
    image,
  };
}

function pageName(repo: GitHubRepo, page: PageMeta): string {
  if (page.title) {
    const primary = page.title.split(/\s+[|—–·]\s+/)[0]?.trim() ?? page.title;
    if (
      primary.length >= 3 &&
      primary.length <= 64 &&
      !/^(home|index|untitled|github pages|document)$/i.test(primary)
    ) {
      return primary;
    }
  }
  return titleize(repo.name);
}

function pageDescription(repo: GitHubRepo, page: PageMeta): string {
  return (
    repo.description?.trim() ||
    page.description?.trim() ||
    ""
  );
}

function overrideFor(
  overrides: Overrides,
  repoName: string,
): { key: string; value: ProjectOverride } | null {
  const wanted = repoName.toLowerCase();
  for (const [key, value] of Object.entries(overrides)) {
    if (key.toLowerCase() === wanted) return { key, value };
  }
  return null;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildProjectData({
  owner,
  repos,
  pages,
  overrides,
  now,
  aggregatorRepoName = `${owner}.github.io`,
}: BuildInput): BuildResult {
  const warnings: string[] = [];
  const unreachable: string[] = [];
  const projects: Project[] = [];
  const usedOverrides = new Set<string>();
  let hidden = 0;

  const candidates = repos.filter(
    (repo) =>
      repo.has_pages &&
      !repo.fork &&
      !repo.private &&
      !repo.disabled &&
      repo.name.toLowerCase() !== aggregatorRepoName.toLowerCase(),
  );

  const candidatesByName = new Map(
    candidates.map((repo) => [repo.name.toLowerCase(), repo]),
  );

  for (const repo of candidates) {
    const overrideMatch = overrideFor(overrides, repo.name);
    const override = overrideMatch?.value;
    if (overrideMatch) usedOverrides.add(overrideMatch.key);

    if (override?.hidden) {
      hidden += 1;
      continue;
    }

    const page = pages.get(repo.name) ?? EMPTY_PAGE;
    if (!page.live) {
      unreachable.push(repo.name);
      if (!override?.includeWhenOffline) continue;
    }

    const url =
      override?.url ??
      (repo.homepage?.startsWith(`https://${owner.toLowerCase()}.github.io/`)
        ? repo.homepage
        : repoPageUrl(owner, repo.name));

    projects.push({
      id: repo.id,
      slug: repo.name.toLowerCase(),
      name: override?.name?.trim() || pageName(repo, page),
      description: override?.description?.trim() ?? pageDescription(repo, page),
      url,
      repoUrl: repo.html_url,
      language: override?.language ?? repo.language,
      topics: dedupe([...(repo.topics ?? []), ...(override?.tags ?? [])]),
      stars: override?.stars ?? repo.stargazers_count,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      deployedAt: page.deployedAt,
      category: override?.category?.trim() || "Other",
      featured: override?.featured ?? false,
      order: override?.order ?? 1000,
      archived: repo.archived,
      image: override?.image ?? page.image,
      manual: false,
      live: page.live,
    });
  }

  let manualIndex = 0;
  for (const [key, override] of Object.entries(overrides)) {
    if (usedOverrides.has(key)) continue;
    if (override.hidden) {
      hidden += 1;
      usedOverrides.add(key);
      continue;
    }
    if (!override.manual) {
      if (!candidatesByName.has(key.toLowerCase())) {
        warnings.push(
          `Override "${key}" does not match a Pages-enabled repository and is not marked manual.`,
        );
      }
      continue;
    }
    if (!override.url) {
      warnings.push(`Manual project "${key}" has no url and was skipped.`);
      continue;
    }

    manualIndex += 1;
    projects.push({
      id: -(manualIndex),
      slug: key.toLowerCase(),
      name: override.name?.trim() || titleize(key),
      description: override.description?.trim() ?? "",
      url: override.url,
      repoUrl: override.repoUrl ?? null,
      language: override.language ?? null,
      topics: dedupe(override.tags ?? []),
      stars: override.stars ?? 0,
      createdAt: now,
      pushedAt: now,
      deployedAt: null,
      category: override.category?.trim() || "Other",
      featured: override.featured ?? false,
      order: override.order ?? 1000,
      archived: false,
      image: override.image ?? null,
      manual: true,
      live: true,
    });
    usedOverrides.add(key);
  }

  projects.sort((a, b) => a.slug.localeCompare(b.slug));
  unreachable.sort((a, b) => a.localeCompare(b));

  const stats: SyncStats = {
    totalRepos: repos.length,
    pagesEnabled: candidates.length,
    live: projects.filter((project) => project.live).length,
    hidden,
    unreachable,
  };

  return {
    data: {
      version: 1,
      owner,
      syncedAt: now,
      projects,
      stats,
    },
    warnings,
    unreachable,
  };
}
