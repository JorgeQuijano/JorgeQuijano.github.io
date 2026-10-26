import { ArrowUpRight, Star, TriangleAlert } from "lucide-react";
import GithubIcon from "./GithubIcon";
import ProjectPreview from "./ProjectPreview";
import {
  formatDate,
  languageColor,
  relativeTime,
  classNames,
} from "../lib/format";
import { projectTimestamp } from "../lib/data";
import type { Project } from "../lib/types";

export default function ProjectCard({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const updated = projectTimestamp(project);

  return (
    <article
      className={classNames(
        "card-lift group flex h-full flex-col border border-line bg-panel",
        featured && "bg-panel-2/40",
      )}
    >
      <a
        href={project.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${project.name}`}
        className="block"
      >
        <ProjectPreview project={project} featured={featured} />
      </a>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
              {project.category}
            </span>
            {project.featured && (
              <span className="inline-flex items-center gap-1 border border-amber/30 bg-amber-soft px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-amber">
                <Star size={8} strokeWidth={2} />
                Featured
              </span>
            )}
          </div>
          {project.archived && (
            <span className="shrink-0 border border-line-strong px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-dim">
              Archived
            </span>
          )}
          {!project.live && (
            <span className="inline-flex shrink-0 items-center gap-1 border border-down/30 bg-down/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-down">
              <TriangleAlert size={8} />
              Check failed
            </span>
          )}
        </div>

        <h3
          className={classNames(
            "mt-2 font-semibold tracking-[-0.02em] text-ink",
            featured ? "text-[1.35rem] leading-tight" : "text-[1.1rem] leading-snug",
          )}
        >
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-baseline gap-1.5 hover:text-amber"
          >
            {project.name}
            <ArrowUpRight
              size={13}
              strokeWidth={1.8}
              className="translate-y-0.5 shrink-0 text-dim transition-colors group-hover:text-amber"
            />
          </a>
        </h3>

        <p
          className={classNames(
            "mt-2 text-[12px] leading-relaxed text-muted",
            featured ? "clamp-3" : "clamp-2",
          )}
        >
          {project.description || "No description yet."}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            {project.language ? (
              <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: languageColor(project.language) }}
                />
                {project.language}
              </span>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-dim">
                {project.manual ? "Manual" : "Other"}
              </span>
            )}
            {project.stars > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] text-muted">
                <Star size={10} strokeWidth={1.8} />
                {project.stars}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className="font-mono text-[9px] uppercase tracking-[0.06em] text-dim"
              title={formatDate(updated, "time")}
            >
              {relativeTime(updated)}
            </span>
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.name} on GitHub`}
                title="View source on GitHub"
                className="text-dim transition-colors hover:text-amber"
              >
                <GithubIcon size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
