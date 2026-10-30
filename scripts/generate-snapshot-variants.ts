import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectData } from "../src/lib/types";
import {
  generateSnapshotVariants,
  snapshotFile,
  snapshotPublicPath,
} from "./lib/snapshots";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = resolve(ROOT, "src/data/projects.generated.json");
const PUBLIC_DIR = resolve(ROOT, "public");

async function main() {
  const data = JSON.parse(
    await readFile(DATA_FILE, "utf8"),
  ) as ProjectData;
  const snapshots = data.projects.filter(
    (project) => project.image === snapshotPublicPath(project.slug),
  );

  for (const project of snapshots) {
    await generateSnapshotVariants(
      resolve(PUBLIC_DIR, snapshotFile(project.slug)),
      PUBLIC_DIR,
      project.slug,
    );
    console.log(`variants: ${project.slug}`);
  }

  console.log(`\nGenerated responsive variants for ${snapshots.length} snapshots.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
