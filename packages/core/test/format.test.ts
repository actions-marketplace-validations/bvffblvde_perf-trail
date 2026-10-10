import { describe, expect, it } from "vitest";
import { formatBytes, formatDelta, formatMetric, formatSeconds } from "../src/index.ts";

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
