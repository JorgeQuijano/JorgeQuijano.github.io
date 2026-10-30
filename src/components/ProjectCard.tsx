import type { MouseEvent } from "react";
import ProjectPreview from "./ProjectPreview";
import {
  formatDate,
  languageColor,
  relativeTime,
  classNames,
} from "../lib/format";
import { projectTimestamp } from "../lib/data";
import type { Project } from "../lib/types";

/**
 * Keep the anchor's target="_blank" as the reliable fallback. For plain
 * left-clicks and taps, this also asks the browser to open the tab in the
 * background. Browsers are free to ignore the focus request.
 */
function openProject(event: MouseEvent<HTMLAnchorElement>, url: string) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.detail === 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  const opened = window.open("", "_blank");
  if (!opened) return;

  try {
    opened.opener = null;
    opened.location.replace(url);
  } catch {
    opened.close();
    return;
  }

  event.preventDefault();

  try {
    opened.blur();
    window.focus();
  } catch {
    // Some browsers do not allow scripted focus changes.
  }
}

export default function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const updated = projectTimestamp(project);
  const statusTitle = project.live
    ? "The last liveness check succeeded."
    : project.offlineSince
      ? `Offline since ${formatDate(project.offlineSince, "time")}`
      : "The last liveness check failed.";

  return (
    <article
      className={classNames(
        "project-card group relative flex h-full flex-col border border-line bg-panel",
        featured && "bg-panel-2",
      )}
    >
      <div className="card-bar">
        <span className="card-path" title={`~/projects/${project.slug}`}>
          ~/projects/{project.slug}
        </span>
        <span
          className="card-state"
          data-live={project.live ? "true" : "false"}
          title={statusTitle}
        >
          <span aria-hidden="true">●</span>
          {project.live ? "live" : "offline"}
        </span>
      </div>

      <ProjectPreview project={project} featured={featured} />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[10px] uppercase tracking-[0.12em] text-muted">
              [{project.category.toLowerCase()}]
            </span>
            {project.featured && (
              <span className="inline-flex items-center gap-1 border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-warn">
                <span aria-hidden="true">★</span>
                featured
              </span>
            )}
          </div>
          {project.archived && (
            <span className="shrink-0 border border-line-strong px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-dim">
              [archived]
            </span>
          )}
        </div>

        <h3
          className={classNames(
            "mt-2 font-medium tracking-[-0.02em] text-ink",
            featured ? "text-[1.3rem] leading-tight" : "text-[1.05rem] leading-snug",
          )}
        >
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => openProject(event, project.url)}
            className="inline-flex items-baseline gap-1.5 hover:text-accent after:absolute after:inset-0 after:z-10 after:content-['']"
          >
            {project.name}
            <span
              aria-hidden="true"
              className="translate-y-0.5 shrink-0 text-[11px] text-dim transition-colors group-hover:text-accent"
            >
              ↗
            </span>
          </a>
        </h3>

        <p
          className={classNames(
            "mt-2 text-[12px] leading-[1.75] text-muted",
            featured ? "clamp-3" : "clamp-2",
          )}
        >
          {project.description || "No description yet."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[10px] text-muted">
          <div className="flex min-w-0 items-center gap-2">
            {project.language ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0"
                  style={{ background: languageColor(project.language) }}
                />
                {project.language.toLowerCase()}
              </span>
            ) : (
              <span className="text-dim">
                {project.manual ? "manual" : "other"}
              </span>
            )}
            {project.stars > 0 && (
              <>
                <span className="text-line-strong" aria-hidden="true">
                  │
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  aria-label={`${project.stars} stars`}
                >
                  <span aria-hidden="true">★</span>
                  {project.stars}
                </span>
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className="tracking-[0.04em] text-dim"
              title={formatDate(updated, "time")}
            >
              {relativeTime(updated)}
            </span>
            {project.repoUrl && (
              <>
                <span className="text-line-strong" aria-hidden="true">
                  │
                </span>
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${project.name} on GitHub`}
                  title="View source on GitHub"
                  className="relative z-20 text-dim transition-colors hover:text-accent"
                >
                  [src]
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
