import type { Entry } from "@perf-trail/core";
import { describe, expect, it } from "vitest";
import { summaryMarkdown } from "../src/summary.ts";

const entry = (sha: string, performance: number, lcp: number, bytes: number): Entry => ({
  v: 1,
  sha,
  date: "2026-10-02T00:00:00.000Z",
  message: "feat: lazy load the editor",
  url: "https://example.com",
  preset: "mobile",
  pages: {
    "/": {
      scores: { performance, accessibility: 100, bestPractices: 100, seo: 100 },
      metrics: { lcp, cls: 0.01, tbt: 50, fcp: 900, si: 1000 },
    },
  },
  bundle: { routes: { "/": bytes } },
});

describe("summaryMarkdown", () => {
  it("shows deltas against the previous entry", () => {
    const previous = {
      ...entry("1111111", 90, 2000, 100 * 1024),
      date: "2026-10-01T00:00:00.000Z",
    };
    const current = {
      ...entry("2222222", 94, 1800, 98 * 1024),
      budgets: { passed: false, failures: ["/ lcp 1800 ms > 1500 ms"] },
    };
    expect(summaryMarkdown(current, previous)).toBe(
      [
        "### perf-trail: 2222222 (mobile)",
        "",
        "> feat: lazy load the editor",
        "",
        "| Page | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
        "| `/` | 94 (+4) | 100 | 100 | 100 | 1800 ms (-200 ms) | 0.01 | 50 ms | 900 ms |",
        "",
        "| Route | JS (gzip) |",
        "| --- | --- |",
        "| `/` | 98 KiB (-2 KiB) |",
        "",
        "**Budgets failed:**",
        "",
        "- / lcp 1800 ms > 1500 ms",
        "",
        "Deltas compare with 1111111 from 2026-10-01.",
        "",
      ].join("\n"),
    );
  });

  it("says when there is nothing to compare with", () => {
    expect(summaryMarkdown(entry("2222222", 94, 1800, 1024), undefined)).toContain(
      "First entry: nothing to compare with yet.",
    );
  });
});
