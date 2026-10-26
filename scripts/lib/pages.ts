import type { GitHubRepo, PageMeta } from "./projects.ts";
import { parsePageMeta } from "./projects.ts";

const API = "https://api.github.com";
const USER_AGENT = "jorgequijano-project-index/1.0";

type RequestOptions = {
  token?: string;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API}${path}`, {
    headers,
    signal: options.signal ?? AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    if (options.token && (response.status === 401 || response.status === 403)) {
      // A repository-scoped Actions token may not be accepted for a public
      // account-level endpoint. Retry once without auth.
      return request<T>(path, { signal: options.signal });
    }
    const body = await response.text().catch(() => "");
    throw new Error(
      `GitHub API ${response.status} ${response.statusText} for ${path}${
        body ? `\n${body.slice(0, 500)}` : ""
      }`,
    );
  }

  return (await response.json()) as T;
}

export async function fetchRepos(
  owner: string,
  token?: string,
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];

  for (let page = 1; ; page += 1) {
    const path = `/users/${encodeURIComponent(
      owner,
    )}/repos?per_page=100&page=${page}&type=owner&sort=updated`;
    const batch = await request<GitHubRepo[]>(path, { token });

    if (!Array.isArray(batch)) {
      throw new Error(`Unexpected GitHub response for ${path}`);
    }

    repos.push(...batch);
    if (batch.length < 100) break;
  }

  return repos;
}

function parseLastModified(value: string | null): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export async function fetchPageMeta(url: string): Promise<PageMeta> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": USER_AGENT,
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("html")) {
      return {
        live: false,
        status: response.status,
        title: null,
        description: null,
        image: null,
        deployedAt: null,
        error: `HTTP ${response.status}${contentType ? ` · ${contentType}` : ""}`,
      };
    }

    const html = await response.text();
    const meta = parsePageMeta(html, response.url || url);

    return {
      live: true,
      status: response.status,
      ...meta,
      deployedAt: parseLastModified(response.headers.get("last-modified")),
      error: null,
    };
  } catch (error) {
    return {
      live: false,
      status: null,
      title: null,
      description: null,
      image: null,
      deployedAt: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
