import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  isDefaultFilters,
  parseFilters,
  serializeFilters,
} from "./filters";

const CATEGORIES = ["Tools", "Food & Health"];
const LANGUAGES = ["TypeScript", "HTML"];

describe("parseFilters", () => {
  it("reads and validates every filter from the URL", () => {
    expect(
      parseFilters(
        "?q=react&category=Tools&language=TypeScript&sort=name",
        CATEGORIES,
        LANGUAGES,
      ),
    ).toEqual({
      query: "react",
      category: "Tools",
      language: "TypeScript",
      sort: "name",
    });
  });

  it("falls back to defaults for unknown values", () => {
    expect(
      parseFilters(
        "?category=Unknown&language=COBOL&sort=popular",
        CATEGORIES,
        LANGUAGES,
      ),
    ).toEqual(DEFAULT_FILTERS);
  });

  it("accepts the virtual Featured category", () => {
    expect(parseFilters("?category=Featured", CATEGORIES, LANGUAGES).category).toBe(
      "Featured",
    );
  });
});

describe("serializeFilters", () => {
  it("omits default filters", () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe("");
  });

  it("encodes active filters and preserves unrelated parameters", () => {
    expect(
      serializeFilters(
        {
          query: "react",
          category: "Food & Health",
          language: "TypeScript",
          sort: "added",
        },
        "?theme=dark",
      ),
    ).toBe("?theme=dark&q=react&category=Food+%26+Health&language=TypeScript&sort=added");
  });

  it("removes filter parameters when they return to defaults", () => {
    expect(
      serializeFilters(DEFAULT_FILTERS, "?theme=dark&category=Tools&sort=name"),
    ).toBe("?theme=dark");
  });
});

describe("filter helpers", () => {
  it("treats whitespace-only searches as the default state", () => {
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, query: "   " })).toBe(true);
  });
});
