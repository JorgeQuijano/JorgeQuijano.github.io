export type ThemeChoice = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

export type Project = {
  id: number;
  slug: string;
  name: string;
  description: string;
  url: string;
  repoUrl: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  createdAt: string;
  pushedAt: string;
  deployedAt: string | null;
  category: string;
  featured: boolean;
  order: number;
  archived: boolean;
  image: string | null;
  manual: boolean;
  live: boolean;
  /** First failed liveness check for a retained project. */
  offlineSince?: string;
  /** Consecutive failed liveness checks while a project is retained. */
  missedChecks?: number;
};

export type SyncStats = {
  totalRepos: number;
  pagesEnabled: number;
  live: number;
  hidden: number;
  unreachable: string[];
};

export type ProjectData = {
  version: 1;
  owner: string;
  syncedAt: string;
  projects: Project[];
  stats: SyncStats;
};
