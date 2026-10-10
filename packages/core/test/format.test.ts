import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDelta,
  formatMetric,
  formatSeconds,
  rateMetric,
  rateScore,
} from "../src/index.ts";

describe("format", () => {
  it("formats metrics", () => {
    expect(formatMetric("lcp", 1234.6)).toBe("1235 ms");
    expect(formatMetric("cls", 0.04648)).toBe("0.046");
    expect(formatMetric("cls", 0)).toBe("0");
  });

  it("formats seconds", () => {
    expect(formatSeconds(1400)).toBe("1.4 s");
    expect(formatSeconds(1234)).toBe("1.23 s");
    expect(formatSeconds(12_345)).toBe("12.3 s");
  });

  it("formats bytes as KiB", () => {
    expect(formatBytes(120_832)).toBe("118 KiB");
    expect(formatBytes(1500)).toBe("1.5 KiB");
  });

  it("formats signed deltas", () => {
    expect(formatDelta(-200, (v) => `${v} ms`)).toBe("-200 ms");
    expect(formatDelta(3, String)).toBe("+3");
    expect(formatDelta(0, String)).toBe("0");
  });
});

describe("rating", () => {
  it("rates scores like Lighthouse", () => {
    expect([90, 89, 50, 49].map(rateScore)).toEqual(["good", "average", "average", "poor"]);
  });

  it("rates metrics by Core Web Vitals thresholds", () => {
    expect(rateMetric("lcp", 2500)).toBe("good");
    expect(rateMetric("lcp", 4000)).toBe("average");
    expect(rateMetric("cls", 0.26)).toBe("poor");
  });
});
