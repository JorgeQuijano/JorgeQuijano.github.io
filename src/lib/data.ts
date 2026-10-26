import raw from "../data/projects.generated.json";
import type { Project, ProjectData } from "./types";

export const data = raw as ProjectData;

const CATEGORY_ORDER = [
  "Finance",
  "Food & Health",
  "Tools",
  "Games",
  "Reference",
  "Audio & Visual",
  "Local",
  "Sports",
  "Shop",
  "Experiments",
  "Other",
];

export const categories = Array.from(
  new Set(data.projects.map((project) => project.category)),
).sort((a, b) => {
  const ai = CATEGORY_ORDER.indexOf(a);
  const bi = CATEGORY_ORDER.indexOf(b);
  if (ai === -1 && bi === -1) return a.localeCompare(b);
  if (ai === -1) return 1;
  if (bi === -1) return -1;
  return ai - bi;
});

export const languages = Array.from(
  new Set(
    data.projects
      .map((project) => project.language)
      .filter((language): language is string => Boolean(language)),
  ),
).sort((a, b) => a.localeCompare(b));

export const featuredProjects = data.projects
  .filter((project) => project.featured)
  .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

export function projectTimestamp(project: Project): string {
  return project.deployedAt ?? project.pushedAt;
}
