import { useEffect, useState } from "react";
import { initials } from "../lib/format";
import type { Project } from "../lib/types";

const PALETTES: Array<[string, string, string]> = [
  ["#5cff8f", "#0b3d1d", "#050806"],
  ["#9dffb8", "#0f5132", "#06110a"],
  ["#38d96b", "#123c1f", "#040906"],
  ["#b6ffcb", "#14532d", "#07110a"],
  ["#4ff08a", "#0a2e17", "#050806"],
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
  const [variantsFailed, setVariantsFailed] = useState(false);
  const palette = PALETTES[hash(project.slug) % PALETTES.length];

  useEffect(() => {
    setImageFailed(false);
    setVariantsFailed(false);
  }, [project.image]);

  const showImage = Boolean(project.image) && !imageFailed;
  const localSnapshot =
    project.image?.startsWith("/snapshots/") &&
    project.image.endsWith(".jpg")
      ? project.image
      : null;
  const imageBase = localSnapshot ? localSnapshot.slice(0, -4) : null;
  const useVariants = Boolean(imageBase) && !variantsFailed;
  const sizes = featured
    ? "(min-width: 1500px) 350px, (min-width: 1280px) calc((100vw - 100px) / 4), (min-width: 640px) calc(50vw - 32px), calc(100vw - 32px)"
    : "(min-width: 1500px) 470px, (min-width: 1280px) calc((100vw - 88px) / 3), (min-width: 640px) calc(50vw - 32px), calc(100vw - 32px)";

  const image = project.image ? (
    <img
      src={project.image}
      alt=""
      loading="lazy"
      decoding="async"
      width={1200}
      height={750}
      referrerPolicy="no-referrer"
      onError={() => {
        if (useVariants) setVariantsFailed(true);
        else setImageFailed(true);
      }}
    />
  ) : null;

  return (
    <div
      className={`project-preview ${
        featured ? "aspect-[16/9]" : "aspect-[16/10]"
      }`}
      style={{
        background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 54%, ${palette[2]} 100%)`,
      }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <span className={`preview-initials ${featured ? "text-7xl" : "text-6xl"}`}>
          {initials(project.name)}
        </span>
      </div>

      {showImage &&
        (useVariants && imageBase ? (
          <picture>
            <source
              type="image/avif"
              srcSet={`${imageBase}-480.avif 480w, ${imageBase}-960.avif 960w`}
              sizes={sizes}
            />
            <source
              type="image/webp"
              srcSet={`${imageBase}-480.webp 480w, ${imageBase}-960.webp 960w`}
              sizes={sizes}
            />
            {image}
          </picture>
        ) : (
          image
        ))}
    </div>
  );
}
