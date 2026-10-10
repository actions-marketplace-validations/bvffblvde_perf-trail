import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fromLhr, type Lhr, measurePage } from "../src/lighthouse.ts";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/lhr-example-com.json", import.meta.url), "utf8"),
) as Lhr;

const withLcp = (lcp: number): Lhr => ({
  ...fixture,
  audits: { ...fixture.audits, "largest-contentful-paint": { numericValue: lcp } },
});

describe("fromLhr", () => {
  it("reads scores and metrics from a Lighthouse 13 result", () => {
    expect(fromLhr(fixture)).toEqual({
      scores: { performance: 93, accessibility: 96, bestPractices: 100, seo: 80 },
      metrics: { lcp: 962, cls: 0.046, tbt: 303, fcp: 779, si: 779 },
    });
  });

  it("fails on a runtime error", () => {
    expect(() =>
      fromLhr({ ...fixture, runtimeError: { code: "ERRORED_DOCUMENT_REQUEST", message: "404" } }),
    ).toThrow("ERRORED_DOCUMENT_REQUEST");
  });

  it("fails on a missing score", () => {
    expect(() =>
      fromLhr({ ...fixture, categories: { ...fixture.categories, seo: { score: null } } }),
    ).toThrow('"seo" has no score');
  });

  it("fails on a missing audit", () => {
    expect(() => fromLhr({ ...fixture, audits: {} })).toThrow("largest-contentful-paint");
  });
});

describe("measurePage", () => {
  it("runs Lighthouse the requested number of times and keeps the median run", async () => {
    const lcps = [3000, 1000, 2000];
    const calls: number[] = [];
    const { result, runs } = await measurePage(
      async (_url, _preset, run) => {
        calls.push(run);
        return withLcp(lcps[run - 1] as number);
      },
      new URL("https://example.com"),
      "mobile",
      3,
    );
    expect(calls).toEqual([1, 2, 3]);
    expect(runs).toHaveLength(3);
    expect(result.metrics.lcp).toBe(2000);
  });
});
