import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { budgetsJsonSchema, entrySchema, historyJsonSchema } from "../src/index.ts";
import { entry } from "./fixtures.ts";

describe("entrySchema", () => {
  it("accepts a full entry", () => {
    const full = entry({
      bundle: { routes: { "/": 120_000 }, chunks: { main: 80_000 } },
      budgets: { passed: false, failures: ["/ lcp 2600 > 2500"] },
    });
    expect(entrySchema.parse(full)).toEqual(full);
  });

  it("accepts an entry without optional fields", () => {
    const { message: _, ...minimal } = entry();
    expect(entrySchema.safeParse(minimal).success).toBe(true);
  });

  it.each([
    ["wrong version", { v: 2 }],
    ["short sha", { sha: "abc" }],
    ["date without time", { date: "2026-10-03" }],
    ["long message", { message: "x".repeat(101) }],
    ["unknown preset", { preset: "tablet" }],
    [
      "fractional score",
      {
        pages: {
          "/": {
            ...entry().pages["/"],
            scores: { performance: 9.5, accessibility: 1, bestPractices: 1, seo: 1 },
          },
        },
      },
    ],
    ["fractional bundle bytes", { bundle: { routes: { "/": 1.5 } } }],
  ])("rejects %s", (_, overrides) => {
    expect(entrySchema.safeParse({ ...entry(), ...overrides }).success).toBe(false);
  });
});

describe("published JSON Schemas", () => {
  it.each([
    ["history.v1.json", historyJsonSchema],
    ["budgets.v1.json", budgetsJsonSchema],
  ])("%s is up to date with the Zod schema", (name, build) => {
    const file = new URL(`../schema/${name}`, import.meta.url);
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual(build());
  });
});
