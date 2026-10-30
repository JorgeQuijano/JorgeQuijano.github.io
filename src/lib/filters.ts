import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const SORT_ORDERS = ["recent", "name", "added"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export type FilterState = {
  query: string;
  category: string;
  language: string;
  sort: SortOrder;
};

export const DEFAULT_FILTERS: FilterState = {
  query: "",
  category: "All",
  language: "All",
  sort: "recent",
};

function isSortOrder(value: string | null): value is SortOrder {
  return value !== null && (SORT_ORDERS as readonly string[]).includes(value);
}

export function parseFilters(
  search: string,
  categories: string[],
  languages: string[],
): FilterState {
  const params = new URLSearchParams(search);
  const category = params.get("category");
  const language = params.get("language");
  const sort = params.get("sort");

  return {
    query: params.get("q") ?? "",
    category:
      category === "Featured" ||
      (category !== null && categories.includes(category))
        ? category
        : "All",
    language:
      language !== null && languages.includes(language) ? language : "All",
    sort: isSortOrder(sort) ? sort : "recent",
  };
}

export function serializeFilters(
  filters: FilterState,
  currentSearch = "",
): string {
  const params = new URLSearchParams(currentSearch);

  if (filters.query.trim()) params.set("q", filters.query);
  else params.delete("q");

  if (filters.category !== "All") params.set("category", filters.category);
  else params.delete("category");

  if (filters.language !== "All") params.set("language", filters.language);
  else params.delete("language");

  if (filters.sort !== "recent") params.set("sort", filters.sort);
  else params.delete("sort");

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function isDefaultFilters(filters: FilterState): boolean {
  return (
    filters.query.trim() === "" &&
    filters.category === "All" &&
    filters.language === "All" &&
    filters.sort === "recent"
  );
}

export function useFilterState(categories: string[], languages: string[]) {
  const [filters, setFiltersState] = useState<FilterState>(() =>
    typeof window === "undefined"
      ? DEFAULT_FILTERS
      : parseFilters(window.location.search, categories, languages),
  );
  const previous = useRef(filters);
  const skipUrlWrite = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (skipUrlWrite.current) {
      skipUrlWrite.current = false;
      previous.current = filters;
      return;
    }

    const nextUrl = `${window.location.pathname}${serializeFilters(
      filters,
      window.location.search,
    )}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      const onlyQueryChanged =
        previous.current.category === filters.category &&
        previous.current.language === filters.language &&
        previous.current.sort === filters.sort;

      window.history[onlyQueryChanged ? "replaceState" : "pushState"](
        null,
        "",
        nextUrl,
      );
    }

    previous.current = filters;
  }, [filters]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      skipUrlWrite.current = true;
      setFiltersState(
        parseFilters(window.location.search, categories, languages),
      );
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [categories, languages]);

  const setFilters = useCallback((update: Partial<FilterState>) => {
    setFiltersState((current) => ({ ...current, ...update }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({ ...DEFAULT_FILTERS });
  }, []);

  const active = useMemo(() => !isDefaultFilters(filters), [filters]);

  return { filters, setFilters, resetFilters, active };
}
