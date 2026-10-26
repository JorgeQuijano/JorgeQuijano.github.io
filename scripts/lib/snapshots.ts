import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { chromium, type Browser } from "playwright-core";
import type { Project } from "../../src/lib/types";
import type { Overrides } from "./projects";

export type SnapshotRecord = {
  file: string;
  sourceUrl: string;
  sourceVersion: string;
  capturedAt: string;
};

export type SnapshotManifest = {
  version: 1;
  snapshots: Record<string, SnapshotRecord>;
};

export type SnapshotRefreshResult = {
  manifest: SnapshotManifest;
  generated: string[];
  failed: Array<{ slug: string; error: string }>;
  skipped: number;
};

export const SNAPSHOT_DIR = "snapshots";

function emptyManifest(): SnapshotManifest {
  return { version: 1, snapshots: {} };
}

export async function readSnapshotManifest(
  path: string,
): Promise<SnapshotManifest> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as SnapshotManifest;
    if (!parsed || typeof parsed !== "object" || !parsed.snapshots) {
      return emptyManifest();
    }
    return { version: 1, snapshots: parsed.snapshots };
  } catch {
    return emptyManifest();
  }
}

export async function writeSnapshotManifest(
  path: string,
  manifest: SnapshotManifest,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export function sanitizeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

export function snapshotFile(slug: string): string {
  return `${SNAPSHOT_DIR}/${sanitizeSlug(slug)}.jpg`;
}

export function snapshotPublicPath(slug: string): string {
  return `/${snapshotFile(slug)}`;
}

function sourceVersion(project: Project): string {
  return project.deployedAt ?? project.pushedAt;
}

function hasImageOverride(overrides: Overrides, slug: string): boolean {
  const wanted = slug.toLowerCase();
  return Object.entries(overrides).some(
    ([key, override]) =>
      key.toLowerCase() === wanted && Boolean(override.image),
  );
}

function isCurrent(
  project: Project,
  manifest: SnapshotManifest,
  publicDir: string,
): boolean {
  const expectedFile = snapshotFile(project.slug);
  const record = manifest.snapshots[project.slug];
  return Boolean(
    record &&
      record.file === expectedFile &&
      record.sourceUrl === project.url &&
      record.sourceVersion === sourceVersion(project) &&
      existsSync(join(publicDir, expectedFile)),
  );
}

async function launchBrowser(): Promise<Browser | null> {
  const args = [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--hide-scrollbars",
  ];

  try {
    const executablePath = process.env.CHROME_PATH;
    if (executablePath) {
      return await chromium.launch({ executablePath, headless: true, args });
    }
    return await chromium.launch({
      channel: "chrome",
      headless: true,
      args,
    });
  } catch (error) {
    console.warn(
      `Snapshots skipped: could not launch Chrome (${
        error instanceof Error ? error.message : String(error)
      }). Existing snapshots will be kept.`,
    );
    return null;
  }
}

async function captureSnapshot(
  browser: Browser,
  project: Project,
  outputPath: string,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    deviceScaleFactor: 1,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(project.url, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    if (response && response.status() >= 400) {
      throw new Error(`HTTP ${response.status()}`);
    }

    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {
      // Some apps keep a connection open. A loaded DOM is enough.
    });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1_200);
    await page.evaluate(() => window.scrollTo(0, 0));

    await mkdir(dirname(outputPath), { recursive: true });
    await page.screenshot({
      path: outputPath,
      type: "jpeg",
      quality: 80,
      fullPage: false,
      animations: "disabled",
      caret: "hide",
    });
  } finally {
    await context.close();
  }
}

export async function refreshSnapshots({
  projects,
  overrides,
  manifest,
  publicDir,
  force = false,
}: {
  projects: Project[];
  overrides: Overrides;
  manifest: SnapshotManifest;
  publicDir: string;
  force?: boolean;
}): Promise<SnapshotRefreshResult> {
  const needs = projects.filter(
    (project) =>
      !hasImageOverride(overrides, project.slug) &&
      (force || !isCurrent(project, manifest, publicDir)),
  );

  if (needs.length === 0) {
    return {
      manifest,
      generated: [],
      failed: [],
      skipped: projects.length,
    };
  }

  const browser = await launchBrowser();
  if (!browser) {
    return {
      manifest,
      generated: [],
      failed: needs.map((project) => ({
        slug: project.slug,
        error: "Chrome unavailable",
      })),
      skipped: projects.length - needs.length,
    };
  }

  const generated: string[] = [];
  const failed: Array<{ slug: string; error: string }> = [];

  try {
    for (const project of needs) {
      const file = snapshotFile(project.slug);
      const outputPath = join(publicDir, file);

      try {
        await captureSnapshot(browser, project, outputPath);
        manifest.snapshots[project.slug] = {
          file,
          sourceUrl: project.url,
          sourceVersion: sourceVersion(project),
          capturedAt: new Date().toISOString(),
        };
        generated.push(project.slug);
      } catch (error) {
        failed.push({
          slug: project.slug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await browser.close();
  }

  return {
    manifest,
    generated,
    failed,
    skipped: projects.length - needs.length,
  };
}

export function applySnapshotImages({
  projects,
  overrides,
  manifest,
  publicDir,
}: {
  projects: Project[];
  overrides: Overrides;
  manifest: SnapshotManifest;
  publicDir: string;
}): void {
  for (const project of projects) {
    if (hasImageOverride(overrides, project.slug)) continue;
    const file = snapshotFile(project.slug);
    const record = manifest.snapshots[project.slug];
    if (
      record?.file === file &&
      existsSync(join(publicDir, file))
    ) {
      project.image = `/${file}`;
    }
  }
}
