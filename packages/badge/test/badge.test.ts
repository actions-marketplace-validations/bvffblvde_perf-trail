import type { Entry } from "@perf-trail/core";
import { describe, expect, it } from "vitest";
import {
  badgesFor,
  colors,
  jsBadge,
  lcpBadge,
  pageSlug,
  renderBadge,
  scoreBadge,
  textWidth,
} from "../src/index.ts";

const page = (performance: number, lcp: number) => ({
  scores: { performance, accessibility: 100, bestPractices: 100, seo: 100 },
  metrics: { lcp, cls: 0, tbt: 0, fcp: 0, si: 0 },
});

const entry: Entry = {
  v: 1,
  sha: "abcdef1",
  date: "2026-10-01T00:00:00.000Z",
  url: "https://example.com",
  preset: "mobile",
  pages: { "/en": page(98, 1400), "/en/cv": page(45, 4100) },
  bundle: { routes: { "/[locale]": 120_832, "/[locale]/cv": 90_000 } },
};

describe("renderBadge", () => {
  it("renders an accessible SVG", () => {
    const svg = renderBadge({ label: "LCP", message: "1.4 s", color: "#123456" });
    expect(svg).toMatch(/^<svg [^>]*role="img" aria-label="LCP: 1.4 s">/);
    expect(svg).toContain("<title>LCP: 1.4 s</title>");
    expect(svg).toContain('fill="#123456"');
  });

  it("escapes text", () => {
    const svg = renderBadge({ label: "<a&b>", message: '"x"', color: "#000" });
    expect(svg).toContain("&lt;a&amp;b&gt;: &quot;x&quot;");
    expect(svg).not.toContain("<a&b>");
  });

  it("grows with the text", () => {
    const short = renderBadge({ label: "JS", message: "1 KiB", color: "#000" });
    const long = renderBadge({ label: "JS", message: "1000 KiB", color: "#000" });
    const width = (svg: string) => Number(/width="(\d+)"/.exec(svg)?.[1]);
    expect(width(long)).toBeGreaterThan(width(short));
  });

  it("matches the snapshot", () => {
    expect(scoreBadge(98)).toMatchSnapshot();
  });
});

describe("textWidth", () => {
  it("measures Verdana 11px text", () => {
    expect(textWidth("Lighthouse")).toBeGreaterThan(55);
    expect(textWidth("Lighthouse")).toBeLessThan(70);
    expect(textWidth("")).toBe(0);
  });
});

describe("thresholds", () => {
  it.each([
    [95, colors.good],
    [90, colors.good],
    [89, colors.average],
    [49, colors.poor],
  ])("score %i", (score, color) => {
    expect(scoreBadge(score)).toContain(`fill="${color}"`);
  });

  it.each([
    [2500, colors.good],
    [2501, colors.average],
    [4001, colors.poor],
  ])("LCP %i ms", (ms, color) => {
    expect(lcpBadge(ms)).toContain(`fill="${color}"`);
  });

  it("colors JS by budget when there is one", () => {
    expect(jsBadge(100 * 1024)).toContain(`fill="${colors.neutral}"`);
    expect(jsBadge(100 * 1024, 160)).toContain(`fill="${colors.good}"`);
    expect(jsBadge(170 * 1024, 160)).toContain(`fill="${colors.poor}"`);
  });
});

describe("pageSlug", () => {
  it.each([
    ["/", "index"],
    ["/en", "en"],
    ["/en/cv", "en-cv"],
    ["/search?q=a b", "search-q-a-b"],
  ])("%s -> %s", (input, slug) => {
    expect(pageSlug(input)).toBe(slug);
  });
});

describe("badgesFor", () => {
  it("writes top level badges for the first page, per page badges and the largest route", () => {
    const files = badgesFor(entry, { bundle: { maxKiB: 160 } });
    expect(Object.keys(files).sort()).toEqual([
      "js.svg",
      "lcp.svg",
      "pages/en-cv/lcp.svg",
      "pages/en-cv/performance.svg",
      "pages/en/lcp.svg",
      "pages/en/performance.svg",
      "performance.svg",
    ]);
    expect(files["performance.svg"]).toContain('aria-label="Lighthouse: 98"');
    expect(files["pages/en-cv/lcp.svg"]).toContain('aria-label="LCP: 4.1 s"');
    expect(files["js.svg"]).toContain('aria-label="JS: 118 KiB"');
    expect(files["js.svg"]).toContain(`fill="${colors.good}"`);
  });

  it("skips the JS badge without bundle data", () => {
    const { bundle: _, ...withoutBundle } = entry;
    expect(badgesFor(withoutBundle)).not.toHaveProperty(["js.svg"]);
  });
});
