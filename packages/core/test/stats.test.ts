import { describe, expect, it } from "vitest";
import { entryDelta, median, pickMedianRun } from "../src/index.ts";
import { entry, page } from "./fixtures.ts";

describe("median", () => {
  it("handles odd and even lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("throws on an empty list", () => {
    expect(() => median([])).toThrow();
  });
});

describe("pickMedianRun", () => {
  it("returns the run closest to the median LCP and FCP", () => {
    const runs = [page(3000, 1500), page(2000, 1000), page(1000, 500)];
    expect(pickMedianRun(runs)).toBe(runs[1]);
  });

  it("returns the only run", () => {
    const run = page(1000);
    expect(pickMedianRun([run])).toBe(run);
  });

  it("throws without runs", () => {
    expect(() => pickMedianRun([])).toThrow();
  });
});

describe("entryDelta", () => {
  it("compares pages present in both entries", () => {
    const prev = entry({ pages: { "/": page(2000, 1000, 90), "/old": page(1) } });
    const next = entry({ pages: { "/": page(1800, 1100, 94), "/new": page(1) } });
    expect(entryDelta(prev, next)).toEqual({
      "/": {
        scores: { performance: 4, accessibility: 0, bestPractices: 0, seo: 0 },
        metrics: { lcp: -200, cls: 0, tbt: 0, fcp: 100, si: 0 },
      },
    });
  });
});
