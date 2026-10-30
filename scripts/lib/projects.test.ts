import { describe, expect, it } from "vitest";
import type { Project, ProjectData } from "../../src/lib/types";
import { parseLastModified } from "./pages.ts";
import {
  buildProjectData,
  MAX_OFFLINE_CHECKS,
  parsePageMeta,
  repoPageUrl,
  titleize,
  type GitHubRepo,
  type PageMeta,
} from "./projects.ts";

function repo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: 1,
    name: "test-project",
    full_name: "JorgeQuijano/test-project",
    html_url: "https://github.com/JorgeQuijano/test-project",
    description: "A test project",
    homepage: null,
    has_pages: true,
    fork: false,
    archived: false,
    private: false,
    language: "TypeScript",
    topics: ["testing"],
    stargazers_count: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    pushed_at: "2026-01-02T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

function page(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    live: true,
    status: 200,
    title: "Test Project",
    description: "A page description",
    image: "https://example.com/og.png",
    deployedAt: "2026-01-03T00:00:00.000Z",
    error: null,
    ...overrides,
  };
}

function previousProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    slug: "test-project",
    name: "Test Project",
    description: "A test project",
    url: "https://jorgequijano.github.io/test-project/",
    repoUrl: "https://github.com/JorgeQuijano/test-project",
    language: "TypeScript",
    topics: ["testing"],
    stars: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    pushedAt: "2026-01-02T00:00:00.000Z",
    deployedAt: "2026-01-03T00:00:00.000Z",
    category: "Tools",
    featured: true,
    order: 5,
    archived: false,
    image: "/snapshots/test-project.jpg",
    manual: false,
    live: true,
    ...overrides,
  };
}

function previousData(projects: Project[]): ProjectData {
  return {
    version: 1,
    owner: "JorgeQuijano",
    syncedAt: "2026-01-03T00:00:00.000Z",
    projects,
    stats: {
      totalRepos: projects.length,
      pagesEnabled: projects.length,
      live: projects.filter((project) => project.live).length,
      hidden: 0,
      unreachable: [],
    },
  };
}

function failedPage(): PageMeta {
  return page({
    live: false,
    status: 404,
    title: null,
    description: null,
    image: null,
    deployedAt: null,
    error: "HTTP 404",
  });
}

describe("parsePageMeta", () => {
  it("extracts title, description and resolves relative images", () => {
    const html = `
      <html>
        <head>
          <title>  A &amp; B — Project  </title>
          <meta name="description" content="A short &quot;description&quot;." />
          <meta property="og:image" content="/social/card.png" />
        </head>
      </html>
    `;
    expect(parsePageMeta(html, "https://jorgequijano.github.io/a-b/")).toEqual({
      title: "A & B — Project",
      description: 'A short "description".',
      image: "https://jorgequijano.github.io/social/card.png",
    });
  });

  it("ignores non-https images", () => {
    const html = `<meta property="og:image" content="http://example.com/card.png" />`;
    expect(parsePageMeta(html, "https://example.com/").image).toBeNull();
  });
});

describe("parseLastModified", () => {
  it("rounds GitHub Pages build timestamps to minute precision", () => {
    expect(parseLastModified("Mon, 26 Oct 2026 03:30:27 GMT")).toBe(
      "2026-10-26T03:30:00.000Z",
    );
    expect(parseLastModified("not a date")).toBeNull();
  });
});

describe("repoPageUrl", () => {
  it("uses the lowercased account origin and keeps the repo path", () => {
    expect(repoPageUrl("JorgeQuijano", "Situation-Index")).toBe(
      "https://jorgequijano.github.io/Situation-Index/",
    );
  });
});

describe("titleize", () => {
  it("turns repo slugs into titles", () => {
    expect(titleize("food-finder")).toBe("Food Finder");
    expect(titleize("london_on_traffic_map")).toBe("London On Traffic Map");
  });
});

describe("buildProjectData", () => {
  it("keeps Pages repos, applies overrides, and hides entries", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [
        repo(),
        repo({
          id: 2,
          name: "hidden-project",
          html_url: "https://github.com/JorgeQuijano/hidden-project",
        }),
        repo({
          id: 3,
          name: "no-pages",
          has_pages: false,
        }),
        repo({
          id: 4,
          name: "JorgeQuijano.github.io",
        }),
      ],
      pages: new Map([
        ["test-project", page()],
        [
          "hidden-project",
          page({ title: "Hidden Project", image: null }),
        ],
      ]),
      overrides: {
        "test-project": {
          name: "Renamed Project",
          category: "Tools",
          featured: true,
          order: 2,
          tags: ["custom"],
        },
        "hidden-project": { hidden: true },
      },
      now: "2026-10-26T00:00:00.000Z",
    });

    expect(result.data.projects).toHaveLength(1);
    const project = result.data.projects[0];
    expect(project.name).toBe("Renamed Project");
    expect(project.category).toBe("Tools");
    expect(project.featured).toBe(true);
    expect(project.order).toBe(2);
    expect(project.topics).toEqual(["testing", "custom"]);
    expect(project.live).toBe(true);
    expect(result.data.stats.pagesEnabled).toBe(2);
    expect(result.data.stats.hidden).toBe(1);
    expect(result.data.projects[0].url).toBe(
      "https://jorgequijano.github.io/test-project/",
    );
  });

  it("excludes unreachable pages and reports them", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo({ name: "down" })],
      pages: new Map([["down", page({ live: false, error: "HTTP 404" })]]),
      overrides: {},
      now: "2026-10-26T00:00:00.000Z",
    });

    expect(result.data.projects).toHaveLength(0);
    expect(result.data.stats.unreachable).toEqual(["down"]);
  });

  it("keeps a previously live project through a short outage", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", failedPage()]]),
      overrides: {},
      now: "2026-10-26T00:00:00.000Z",
      previous: previousData([previousProject()]),
    });

    expect(result.data.projects).toHaveLength(1);
    expect(result.data.projects[0]).toMatchObject({
      slug: "test-project",
      name: "Test Project",
      description: "A test project",
      url: "https://jorgequijano.github.io/test-project/",
      image: "/snapshots/test-project.jpg",
      deployedAt: "2026-01-03T00:00:00.000Z",
      category: "Tools",
      featured: true,
      order: 5,
      live: false,
      offlineSince: "2026-10-26T00:00:00.000Z",
      missedChecks: 1,
    });
    expect(result.data.stats.unreachable).toEqual(["test-project"]);
    expect(result.data.stats.live).toBe(0);
  });

  it("increments missed checks and clears them after recovery", () => {
    const retained = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", failedPage()]]),
      overrides: {},
      now: "2026-10-26T01:00:00.000Z",
      previous: previousData([
        previousProject({
          live: false,
          offlineSince: "2026-10-26T00:00:00.000Z",
          missedChecks: 2,
        }),
      ]),
    });
    expect(retained.data.projects[0]).toMatchObject({
      live: false,
      offlineSince: "2026-10-26T00:00:00.000Z",
      missedChecks: 3,
    });

    const recovered = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", page()]]),
      overrides: {},
      now: "2026-10-26T02:00:00.000Z",
      previous: previousData([
        previousProject({
          live: false,
          offlineSince: "2026-10-26T00:00:00.000Z",
          missedChecks: 2,
        }),
      ]),
    });
    expect(recovered.data.projects[0].live).toBe(true);
    expect(recovered.data.projects[0].offlineSince).toBeUndefined();
    expect(recovered.data.projects[0].missedChecks).toBeUndefined();
  });

  it("drops a retained project after the grace period", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", failedPage()]]),
      overrides: {},
      now: "2026-10-26T00:00:00.000Z",
      previous: previousData([
        previousProject({
          live: false,
          offlineSince: "2026-10-25T00:00:00.000Z",
          missedChecks: MAX_OFFLINE_CHECKS,
        }),
      ]),
    });

    expect(result.data.projects).toHaveLength(0);
    expect(result.data.stats.unreachable).toEqual(["test-project"]);
  });

  it("keeps an offline project when includeWhenOffline is set", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", failedPage()]]),
      overrides: {
        "test-project": { includeWhenOffline: true, category: "Tools" },
      },
      now: "2026-10-26T00:00:00.000Z",
    });

    expect(result.data.projects).toHaveLength(1);
    expect(result.data.projects[0]).toMatchObject({
      slug: "test-project",
      live: false,
      category: "Tools",
      offlineSince: "2026-10-26T00:00:00.000Z",
      missedChecks: 1,
    });
  });

  it("does not add a project that has never been live", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [repo()],
      pages: new Map([["test-project", failedPage()]]),
      overrides: {},
      now: "2026-10-26T00:00:00.000Z",
      previous: previousData([]),
    });

    expect(result.data.projects).toHaveLength(0);
    expect(result.data.stats.unreachable).toEqual(["test-project"]);
  });

  it("supports manual entries", () => {
    const result = buildProjectData({
      owner: "JorgeQuijano",
      repos: [],
      pages: new Map(),
      overrides: {
        "external-thing": {
          manual: true,
          name: "External Thing",
          description: "Hosted elsewhere.",
          url: "https://example.com/",
          repoUrl: "https://github.com/JorgeQuijano/external-thing",
          category: "Experiments",
          featured: true,
        },
      },
      now: "2026-10-26T00:00:00.000Z",
    });

    expect(result.data.projects).toHaveLength(1);
    expect(result.data.projects[0]).toMatchObject({
      name: "External Thing",
      url: "https://example.com/",
      category: "Experiments",
      featured: true,
      manual: true,
      live: true,
    });
  });
});
