const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DATE_SHORT = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DATE_TIME = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatDate(iso: string | null | undefined, mode: "short" | "time" = "short") {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return mode === "time" ? DATE_TIME.format(date) : DATE_SHORT.format(date);
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "unknown";

  const diff = then - Date.now();
  const abs = Math.abs(diff);

  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return RELATIVE.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return RELATIVE.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 2_592_000_000)
    return RELATIVE.format(Math.round(diff / 86_400_000), "day");
  if (abs < 31_536_000_000)
    return RELATIVE.format(Math.round(diff / 2_592_000_000), "month");
  return RELATIVE.format(Math.round(diff / 31_536_000_000), "year");
}

export function languageColor(language: string | null | undefined): string {
  switch (language) {
    case "TypeScript":
      return "#3178c6";
    case "JavaScript":
      return "#f1e05a";
    case "Python":
      return "#3572a5";
    case "HTML":
      return "#e34c26";
    case "CSS":
      return "#563d7c";
    case "Rust":
      return "#dea584";
    case "Go":
      return "#00add8";
    default:
      return "#8b949e";
  }
}

export function initials(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "JQ";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
