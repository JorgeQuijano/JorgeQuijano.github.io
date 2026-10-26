import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { initials } from "../lib/format";
import type { Project } from "../lib/types";

const PALETTES: Array<[string, string, string]> = [
  ["#ffb000", "#9a3412", "#1c1917"],
  ["#4dd0e1", "#0e7490", "#082f49"],
  ["#c084fc", "#6d28d9", "#1e1b4b"],
  ["#34d399", "#047857", "#052e2b"],
  ["#fb923c", "#b91c1c", "#1c1917"],
  ["#60a5fa", "#1d4ed8", "#111827"],
  ["#f472b6", "#be185d", "#1f0a1a"],
];

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) >>> 0;
  }
  return result;
}

export default function ProjectPreview({
  project,
  featured = false,
}: {
  project: Project;
  featured?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const palette = PALETTES[hash(project.slug) % PALETTES.length];

  useEffect(() => {
    setImageFailed(false);
  }, [project.image]);

  const showImage = Boolean(project.image) && !imageFailed;

  return (
    <div
      className={`project-preview ${
        featured ? "aspect-[16/9]" : "aspect-[16/10]"
      }`}
      style={{
        background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 54%, ${palette[2]} 100%)`,
      }}
    >
      {showImage ? (
        <img
          src={project.image ?? ""}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`preview-initials ${featured ? "text-7xl" : "text-6xl"}`}>
            {initials(project.name)}
          </span>
        </div>
      )}

      <div className="preview-scrim" />

      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
        <span className="inline-flex items-center gap-1.5 border border-white/30 bg-black/45 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white backdrop-blur-sm">
          <span
            className={
              project.live
                ? "live-dot"
                : "h-1.5 w-1.5 rounded-full bg-amber"
            }
          />
          {project.live ? "Live" : "Check failed"}
        </span>
        <span className="grid h-7 w-7 place-items-center border border-white/25 bg-black/40 text-white backdrop-blur-sm transition-colors group-hover:border-white/50 group-hover:bg-black/55">
          <ArrowUpRight size={13} strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}
