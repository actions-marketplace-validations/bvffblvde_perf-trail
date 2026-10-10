import type { Entry, PageResult } from "../src/index.ts";

export function page(lcp: number, fcp = 1000, performance = 95): PageResult {
  return {
    scores: { performance, accessibility: 100, bestPractices: 100, seo: 100 },
    metrics: { lcp, cls: 0.01, tbt: 50, fcp, si: 1200 },
  };
}

export function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    v: 1,
    sha: "86971f0d3165aab9e4dc6e3b4b86ef5ee55d1e3c",
    date: "2026-10-03T22:43:13.000Z",
    message: "fix: something",
    url: "https://example.com",
    preset: "mobile",
    pages: { "/": page(2000) },
    ...overrides,
  };
}
