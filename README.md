# Project Index

A live index of my GitHub Pages projects: **https://jorgequijano.github.io/**

![Project Index](docs/screenshot.png)

The page is a static Vite + React site. A scheduled GitHub Action discovers every public repository with GitHub Pages enabled, checks that the page is live, merges manual curation, commits the generated index, and deploys the site.

## How it works

```text
GitHub REST API
  GET /users/JorgeQuijano/repos
        │
        │  keep has_pages === true, !fork, !private
        ▼
scripts/sync-projects.ts
  ├─ GET https://jorgequijano.github.io/<repo>/  (liveness + page metadata)
  ├─ merge data/projects.yml                    (names, categories, featured, hidden)
  └─ write src/data/projects.generated.json
        │
        ▼
Vite + React build
        │
        ▼
GitHub Actions → GitHub Pages
```

There is no server and no database. The generated JSON is committed so the last good index survives an API outage, and the workflow deploys it as a static site.

### Why `has_pages`?

The repository object returned by the GitHub REST API includes a `has_pages` boolean. One paginated call is enough to find every Pages-enabled repo. The unauthenticated Pages endpoint (`/repos/{owner}/{repo}/pages`) returns 404 even for public sites, so querying it 20+ times is not useful here.

### Liveness check

`has_pages` can be true before a site is built. The sync script fetches each project URL, keeps only `200` HTML responses, and records the `last-modified` header as the deployment time. It also reads the page title, meta description, and Open Graph image to improve cards when the repository has no description or image.

### Snapshots

Every card uses a local screenshot at `public/snapshots/<slug>.jpg`. The sync script captures a 1200×750 browser screenshot with Playwright and the system Chrome, then uses it as the card image. Open Graph images are only a fallback.

Snapshots are refreshed only when a project's `deployedAt`/`pushedAt` or URL changes, or when the image is missing. `data/snapshots.json` records the source version so the repo does not accumulate noisy screenshot commits.

```sh
npm run projects:snapshots   # force-refresh every snapshot
```

If Chrome is unavailable, the sync keeps existing snapshots and falls back to Open Graph images or the generated gradient. Set `CHROME_PATH` to point at a Chrome binary if needed. In GitHub Actions, the `ubuntu-latest` runner already includes Chrome.

## Adding a project

1. Create a public repo under `JorgeQuijano`.
2. Enable **Settings → Pages** and choose a source (GitHub Actions or a branch).
3. Push the site and wait for Pages to finish building.
4. The next scheduled sync will find it. No code changes are needed.

New projects appear within the sync interval (currently every six hours). To refresh immediately, run **Actions → Sync projects and deploy → Run workflow**.

If the new page is not ready yet, it will be skipped until the next run. It will also appear in the workflow log as an unreachable URL.

### Curating a project

Edit `data/projects.yml`:

```yaml
projects:
  my-repo:
    name: My Project
    description: A better description than the repo has.
    category: Tools
    featured: true
    order: 5
    tags: [typescript, cli]
```

- `name`, `description`, `category`, `featured`, `order`, `tags`, `image`, and `url` override the discovered data.
- `hidden: true` removes a project from the index.
- `includeWhenOffline: true` keeps a project that is currently not responding.
- `manual: true` adds a project that is not a Pages-enabled repo (for example, a custom domain or a site hosted elsewhere).

Manual example:

```yaml
projects:
  my-other-project:
    manual: true
    name: My Other Project
    description: Hosted somewhere else.
    url: https://example.com/
    repoUrl: https://github.com/JorgeQuijano/my-other-project
    category: Experiments
```

The hidden entry for `jquijano.github.io` is intentional: it is a 2022 project page at `/jquijano.github.io/`, not the account root. Remove `hidden: true` to include it.

## Local development

```sh
npm install
npm run projects:sync       # fetch repos + pages, refresh stale snapshots, rewrite JSON
npm run projects:snapshots  # force-refresh every page snapshot
npm run dev                 # http://localhost:5173/
npm test
npm run build
npm run preview
```

The sync script works unauthenticated for public repositories. To avoid rate limits locally:

```sh
GITHUB_TOKEN=$(gh auth token) npm run projects:sync
```

Preview the discovery without writing:

```sh
npm run projects:sync -- --dry-run
```

## Theme

The theme selector lives in the header with three choices:

- **System** (default) follows `prefers-color-scheme` and updates live when the OS changes.
- **Dark** is the terminal-inspired dark theme.
- **Light** is the warm paper theme.

The choice is stored in `localStorage` under `jq-theme`. You can force a theme for a link or screenshot with `?theme=dark`, `?theme=light`, or `?theme=system`.

## Deployment

The workflow is `.github/workflows/sync-and-deploy.yml`.

- Runs on pushes to `main`, every six hours, and on manual dispatch.
- Uses `GITHUB_TOKEN` for the GitHub API; no PAT is required for public repos.
- Commits `src/data/projects.generated.json` only when project data changes.
- Deploys with the official GitHub Pages Actions.
- If the sync fails, the site still deploys the last committed index and the job fails so the problem is visible.

For this to work as the account root, the repository must be named **`JorgeQuijano.github.io`**. GitHub serves that special repo at `https://jorgequijano.github.io/`; project pages remain at `https://jorgequijano.github.io/<repo>/`.

### Private Pages or custom domains

The public API only sees public repositories, and this index intentionally lists public pages. Custom domains can be handled with a `url:` override in `data/projects.yml`.

If you later want private Pages, add a fine-grained read-only token with **Metadata: read** and **Pages: read**, adapt the sync to include the repos you want, and keep private URLs out of the public list unless you intend to expose them. Never expose the token to the browser.

## Files

```text
.github/workflows/sync-and-deploy.yml  scheduled sync + Pages deploy
data/projects.yml                      manual curation
scripts/sync-projects.ts               discovery + generation
scripts/lib/projects.ts                filtering, merging, page metadata parser
scripts/lib/pages.ts                   GitHub API + page fetcher
scripts/lib/snapshots.ts               Playwright screenshot capture + manifest
data/snapshots.json                    snapshot source versions
public/snapshots/*.jpg                 generated card snapshots
src/data/projects.generated.json       generated; do not edit by hand
src/lib/theme.tsx                      system/dark/light theme provider
src/components/                        index UI
```

## Caveats

- GitHub Actions cron is best-effort. New projects normally appear within six hours, but may be delayed.
- Scheduled workflows in public repositories can be disabled after 60 days without repository activity. Re-enable the workflow or push a commit if that happens.
- A project temporarily returning a non-200 response is skipped from the index and listed as unreachable in the workflow log.
- Do not create a directory in this repo named after a project repo (`/situation-index/` belongs to that project). Generated assets use `/_index/` to reduce collisions.
- The index is public-only by default. Do not add private URLs to a public index without intending to expose them.
