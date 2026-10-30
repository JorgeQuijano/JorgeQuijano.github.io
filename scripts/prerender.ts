import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser } from "playwright-core";
import { preview } from "vite";
import type { ProjectData } from "../src/lib/types";
import { launchChrome } from "./lib/chrome";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = resolve(ROOT, "dist");
const INDEX_FILE = resolve(DIST, "index.html");
const DATA_FILE = resolve(ROOT, "src/data/projects.generated.json");
const SITE_URL = "https://jorgequijano.github.io/";
const SITE_NAME = "Jorge Quijano — Project Index";

function structuredData(data: ProjectData) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description:
          "A live index of Jorge Quijano's GitHub Pages projects — tools, games, references, and experiments.",
        author: { "@id": `${SITE_URL}#person` },
        mainEntity: { "@id": `${SITE_URL}#projects` },
      },
      {
        "@type": "Person",
        "@id": `${SITE_URL}#person`,
        name: "Jorge Quijano",
        url: SITE_URL,
        sameAs: ["https://github.com/JorgeQuijano"],
      },
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}#projects`,
        name: "Projects",
        numberOfItems: data.projects.length,
        dateModified: data.syncedAt,
        itemListElement: data.projects.map((project, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: project.name,
            description: project.description || undefined,
            url: project.url,
            ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
          },
        })),
      },
    ],
  };
}

function injectJsonLd(html: string, data: ProjectData): string {
  const json = JSON.stringify(structuredData(data), null, 2).replace(
    /</g,
    "\\u003c",
  );
  const withoutExistingJsonLd = html.replace(
    /\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g,
    "",
  );
  return withoutExistingJsonLd.replace(
    "</head>",
    `  <script type="application/ld+json">\n${json}\n  </script>\n</head>`,
  );
}

async function renderIndex(): Promise<string> {
  const server = await preview({
    root: ROOT,
    logLevel: "error",
    preview: { host: "127.0.0.1", port: 0 },
  });
  let browser: Browser | undefined;

  try {
    const url = server.resolvedUrls?.local[0];
    if (!url) throw new Error("The preview server did not expose a local URL.");

    browser = await launchChrome();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForSelector("#projects article", {
      state: "attached",
      timeout: 15_000,
    });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.waitForTimeout(250);

    return await page.evaluate(
      () => `<!doctype html>\n${document.documentElement.outerHTML}`,
    );
  } finally {
    await browser?.close();
    await server.close();
  }
}

async function main() {
  const data = JSON.parse(
    await readFile(DATA_FILE, "utf8"),
  ) as ProjectData;

  let html = await readFile(INDEX_FILE, "utf8");

  try {
    html = await renderIndex();
  } catch (error) {
    if (process.env.CI) throw error;
    console.warn(
      `Pre-render skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  await writeFile(INDEX_FILE, injectJsonLd(html, data), "utf8");

  const lastmod = data.syncedAt.slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
  await writeFile(resolve(DIST, "sitemap.xml"), sitemap, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
