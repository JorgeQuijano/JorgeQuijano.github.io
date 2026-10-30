import { existsSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Browser } from "playwright-core";
import sharp from "sharp";
import type { Project } from "../../src/lib/types";
import { launchChrome } from "./chrome";
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
  variantsGenerated: string[];
  failed: Array<{ slug: string; error: string }>;
  skipped: number;
};

export const SNAPSHOT_DIR = "snapshots";
export const SNAPSHOT_WIDTHS = [480, 960] as const;
export const SNAPSHOT_FORMATS = ["avif", "webp"] as const;

type SnapshotFormat = (typeof SNAPSHOT_FORMATS)[number];

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

export function snapshotVariantFile(
  slug: string,
  width: number,
  format: SnapshotFormat,
): string {
  return `${SNAPSHOT_DIR}/${sanitizeSlug(slug)}-${width}.${format}`;
}

export function snapshotVariantFiles(slug: string): string[] {
  return SNAPSHOT_WIDTHS.flatMap((width) =>
    SNAPSHOT_FORMATS.map((format) => snapshotVariantFile(slug, width, format)),
  );
}

export function hasSnapshotVariants(publicDir: string, slug: string): boolean {
  return snapshotVariantFiles(slug).every((file) =>
    existsSync(join(publicDir, file)),
  );
}

export async function generateSnapshotVariants(
  masterPath: string,
  publicDir: string,
  slug: string,
): Promise<void> {
  for (const width of SNAPSHOT_WIDTHS) {
    for (const format of SNAPSHOT_FORMATS) {
      const outputPath = join(publicDir, snapshotVariantFile(slug, width, format));
      await mkdir(dirname(outputPath), { recursive: true });

      const pipeline = sharp(masterPath).resize({
        width,
        withoutEnlargement: true,
      });

      if (format === "avif") {
        await pipeline.avif({ quality: 50, effort: 4 }).toFile(outputPath);
      } else {
        await pipeline.webp({ quality: 78, effort: 4 }).toFile(outputPath);
      }
    }
  }
}

async function removeSnapshotVariants(publicDir: string, slug: string) {
  await Promise.all(
    snapshotVariantFiles(slug).map((file) =>
      rm(join(publicDir, file), { force: true }),
    ),
  );
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
  try {
    return await launchChrome();
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
  const tracked = projects.filter(
    (project) => !hasImageOverride(overrides, project.slug),
  );
  const needs = tracked.filter(
    (project) =>
      force || !isCurrent(project, manifest, publicDir),
  );
  const variantsOnly = tracked.filter(
    (project) =>
      !force &&
      isCurrent(project, manifest, publicDir) &&
      !hasSnapshotVariants(publicDir, project.slug),
  );
  const affected = new Set(
    [...needs, ...variantsOnly].map((project) => project.slug),
  );

  const generated: string[] = [];
  const variantsGenerated: string[] = [];
  const failed: Array<{ slug: string; error: string }> = [];

  // Backfill missing variants from an already-current JPEG without taking a
  // new screenshot.
  for (const project of variantsOnly) {
    try {
      await generateSnapshotVariants(
        join(publicDir, snapshotFile(project.slug)),
        publicDir,
        project.slug,
      );
      variantsGenerated.push(project.slug);
    } catch (error) {
      failed.push({
        slug: project.slug,
        error: `variants: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  if (needs.length === 0) {
    return {
      manifest,
      generated,
      variantsGenerated,
      failed,
      skipped: projects.length - affected.size,
    };
  }

  const browser = await launchBrowser();
  if (!browser) {
    return {
      manifest,
      generated,
      variantsGenerated,
      failed: [
        ...failed,
        ...needs.map((project) => ({
          slug: project.slug,
          error: "Chrome unavailable",
        })),
      ],
      skipped: projects.length - affected.size,
    };
  }

  try {
    for (const project of needs) {
      const file = snapshotFile(project.slug);
      const outputPath = join(publicDir, file);

      try {
        await captureSnapshot(browser, project, outputPath);
        await removeSnapshotVariants(publicDir, project.slug);

        try {
          await generateSnapshotVariants(outputPath, publicDir, project.slug);
          variantsGenerated.push(project.slug);
        } catch (error) {
          failed.push({
            slug: project.slug,
            error: `variants: ${error instanceof Error ? error.message : String(error)}`,
          });
        }

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
    variantsGenerated,
    failed,
    skipped: projects.length - affected.size,
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
