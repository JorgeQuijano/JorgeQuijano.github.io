import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { ProjectData } from "../src/lib/types.ts";
import {
  buildProjectData,
  repoPageUrl,
  type GitHubRepo,
  type Overrides,
  type PageMeta,
} from "./lib/projects.ts";
import { fetchPageMeta, fetchRepos } from "./lib/pages.ts";
import {
  applySnapshotImages,
  readSnapshotManifest,
  refreshSnapshots,
  writeSnapshotManifest,
} from "./lib/snapshots.ts";

const OWNER = "JorgeQuijano";
const AGGREGATOR_REPO = `${OWNER}.github.io`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = resolve(ROOT, "src/data/projects.generated.json");
const OVERRIDES_FILE = resolve(ROOT, "data/projects.yml");
const PUBLIC_DIR = resolve(ROOT, "public");
const SNAPSHOT_MANIFEST_FILE = resolve(ROOT, "data/snapshots.json");
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_SNAPSHOTS = process.argv.includes("--skip-snapshots");
const FORCE_SNAPSHOTS = process.argv.includes("--force-snapshots");

async function readOverrides(): Promise<Overrides> {
  try {
    const raw = await readFile(OVERRIDES_FILE, "utf8");
    const parsed = parse(raw) as { projects?: Overrides } | null;
    return parsed?.projects ?? {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

async function readExisting(): Promise<ProjectData | null> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as ProjectData;
    if (!Array.isArray(parsed.projects)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function run() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run()),
  );
  return results;
}

function sameContent(a: ProjectData, b: ProjectData): boolean {
  return (
    JSON.stringify(a.projects) === JSON.stringify(b.projects) &&
    JSON.stringify(a.stats) === JSON.stringify(b.stats)
  );
}

async function main() {
  const token = process.env.GITHUB_TOKEN?.trim() || undefined;
  const overrides = await readOverrides();

  console.log(`Fetching public repositories for ${OWNER}…`);
  const allRepos = await fetchRepos(OWNER, token);
  const repos: GitHubRepo[] = allRepos.filter((repo) => !repo.private);
  const candidates = repos.filter(
    (repo) =>
      repo.has_pages &&
      !repo.fork &&
      !repo.disabled &&
      repo.name.toLowerCase() !== AGGREGATOR_REPO.toLowerCase(),
  );

  console.log(
    `${repos.length} public repos · ${candidates.length} Pages candidates${
      token ? " · using GITHUB_TOKEN" : " · unauthenticated"
    }`,
  );

  const pages = new Map<string, PageMeta>();
  await mapLimit(candidates, 5, async (repo) => {
    const url = repoPageUrl(OWNER, repo.name);
    const page = await fetchPageMeta(url);
    pages.set(repo.name, page);
    const status = page.live ? "ok  " : "fail";
    console.log(
      `${status} ${repo.name.padEnd(34)} ${url}${
        page.error ? `  (${page.error})` : ""
      }`,
    );
    return page;
  });

  const result = buildProjectData({
    owner: OWNER,
    repos,
    pages,
    overrides,
    now: new Date().toISOString(),
    aggregatorRepoName: AGGREGATOR_REPO,
  });

  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }

  if (result.data.projects.length === 0) {
    throw new Error("No live projects discovered; refusing to write an empty index.");
  }

  const existing = await readExisting();
  if (existing) {
    const previousBySlug = new Map(
      existing.projects.map((project) => [project.slug, project]),
    );
    for (const project of result.data.projects) {
      if (!project.manual) continue;
      const previous = previousBySlug.get(project.slug);
      if (previous) {
        project.createdAt = previous.createdAt;
        project.pushedAt = previous.pushedAt;
      }
    }
  }

  let snapshots = await readSnapshotManifest(SNAPSHOT_MANIFEST_FILE);
  if (!SKIP_SNAPSHOTS && !DRY_RUN) {
    const refresh = await refreshSnapshots({
      projects: result.data.projects,
      overrides,
      manifest: snapshots,
      publicDir: PUBLIC_DIR,
      force: FORCE_SNAPSHOTS,
    });
    snapshots = refresh.manifest;

    if (refresh.generated.length > 0) {
      console.log(
        `\nCaptured ${refresh.generated.length} snapshots: ${refresh.generated.join(
          ", ",
        )}`,
      );
      await writeSnapshotManifest(SNAPSHOT_MANIFEST_FILE, snapshots);
    }
    if (refresh.failed.length > 0) {
      for (const failure of refresh.failed) {
        console.warn(
          `snapshot warning: ${failure.slug} — ${failure.error}`,
        );
      }
    }
  }

  applySnapshotImages({
    projects: result.data.projects,
    overrides,
    manifest: snapshots,
    publicDir: PUBLIC_DIR,
  });

  const changed = !existing || !sameContent(existing, result.data);
  const output: ProjectData =
    existing && !changed ? { ...result.data, syncedAt: existing.syncedAt } : result.data;

  console.log(
    `\n${output.projects.length} projects included · ${output.stats.live} live · ${
      output.stats.hidden
    } hidden · ${output.stats.unreachable.length} unreachable`,
  );

  if (result.data.stats.unreachable.length > 0) {
    console.log(`Skipped: ${result.data.stats.unreachable.join(", ")}`);
  }

  if (DRY_RUN) {
    console.log("Dry run — no files written.");
    console.log(
      output.projects
        .slice(0, 8)
        .map((project) => `  ${project.slug} → ${project.name}`)
        .join("\n"),
    );
    return;
  }

  await mkdir(dirname(DATA_FILE), { recursive: true });
  const temporary = `${DATA_FILE}.tmp`;
  await writeFile(temporary, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  await rename(temporary, DATA_FILE);

  console.log(
    `${changed ? "Updated" : "Unchanged"} ${DATA_FILE.replace(`${ROOT}/`, "")}`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
