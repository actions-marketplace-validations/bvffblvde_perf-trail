import { describe, expect, it } from "vitest";
import { evaluateBudgets, parseBudgets } from "../src/index.ts";
import { entry, page } from "./fixtures.ts";

describe("parseBudgets", () => {
  it("accepts a full budgets file", () => {
    const budgets = {
      $schema: "https://example.com/budgets.v1.json",
      scores: { performance: 95, accessibility: 100 },
      metrics: { lcp: 2500, cls: 0.05, tbt: 200 },
      pages: { "/en/cv": { metrics: { lcp: 2000 } } },
      bundle: { maxKiB: 160, routes: { "/[locale]/admin": 300 } },
    };
    expect(parseBudgets(budgets)).toEqual(budgets);
  });

  it.each([
    ["unknown keys", { score: { performance: 90 } }, "score"],
    ["unknown metric", { metrics: { inp: 200 } }, "metrics"],
    ["score above 100", { scores: { seo: 101 } }, "scores.seo"],
    ["negative limit", { bundle: { maxKiB: -1 } }, "bundle.maxKiB"],
  ])("rejects %s", (_, input, path) => {
    expect(() => parseBudgets(input)).toThrow(path);
  });
});

describe("evaluateBudgets", () => {
  const measured = entry({
    pages: { "/en": page(2600, 1000, 93), "/en/cv": page(1900, 900, 99) },
    bundle: { routes: { "/[locale]": 165 * 1024, "/[locale]/admin": 250 * 1024 } },
  });

  it("passes without limits", () => {
    expect(evaluateBudgets(measured, {})).toEqual({ passed: true, failures: [] });
  });

  it("reports every broken limit in a readable form", () => {
    const result = evaluateBudgets(measured, {
      scores: { performance: 95 },
      metrics: { lcp: 2500, cls: 0.005 },
      bundle: { maxKiB: 160, routes: { "/[locale]/admin": 300 } },
    });
    expect(result).toEqual({
      passed: false,
      failures: [
        "/en performance 93 < 95",
        "/en lcp 2600 ms > 2500 ms",
        "/en cls 0.01 > 0.005",
        "/en/cv cls 0.01 > 0.005",
        "bundle /[locale] 165 KiB > 160 KiB",
      ],
    });
  });

  it("lets a page override the defaults", () => {
    const result = evaluateBudgets(measured, {
      metrics: { lcp: 2000 },
      pages: { "/en": { metrics: { lcp: 3000 } } },
    });
    expect(result.failures).toEqual([]);
  });

  it("ignores bundle limits when the entry has no bundle", () => {
    const { bundle: _, ...withoutBundle } = measured;
    expect(evaluateBudgets(withoutBundle, { bundle: { maxKiB: 1 } }).passed).toBe(true);
  });
});
