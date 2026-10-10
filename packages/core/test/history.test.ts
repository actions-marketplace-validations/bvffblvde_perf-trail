import { describe, expect, it } from "vitest";
import { appendEntry, firstLine, latest, parseHistory } from "../src/index.ts";
import { entry } from "./fixtures.ts";

const at = (sha: string, date: string, preset: "mobile" | "desktop" = "mobile") =>
  entry({ sha, date, preset });

describe("firstLine", () => {
  it("keeps the first trimmed line", () => {
    expect(firstLine("  feat: a  \n\nbody")).toBe("feat: a");
  });

  it("truncates to the limit with an ellipsis", () => {
    const line = firstLine("x".repeat(150));
    expect(line).toHaveLength(100);
    expect(line.endsWith("…")).toBe(true);
  });
});

describe("appendEntry", () => {
  it("keeps entries sorted by date", () => {
    const history = [at("aaaaaaa", "2026-01-02T00:00:00Z")];
    const result = appendEntry(history, at("bbbbbbb", "2026-01-01T00:00:00Z"), 10);
    expect(result.map((e) => e.sha)).toEqual(["bbbbbbb", "aaaaaaa"]);
  });

  it("replaces a re-run of the same sha and preset", () => {
    const history = [
      at("aaaaaaa", "2026-01-01T00:00:00Z"),
      at("aaaaaaa", "2026-01-01T00:00:00Z", "desktop"),
    ];
    const rerun = { ...at("aaaaaaa", "2026-01-01T00:00:00Z"), message: "again" };
    const result = appendEntry(history, rerun, 10);
    expect(result).toHaveLength(2);
    expect(result.find((e) => e.preset === "mobile")?.message).toBe("again");
  });

  it("drops the oldest entries beyond the limit", () => {
    const history = ["2026-01-01", "2026-01-02", "2026-01-03"].map((d, i) =>
      at(`${i}`.repeat(7), `${d}T00:00:00Z`),
    );
    const result = appendEntry(history, at("9999999", "2026-01-04T00:00:00Z"), 3);
    expect(result.map((e) => e.sha)).toEqual(["1111111", "2222222", "9999999"]);
  });

  it("rejects a non-positive limit", () => {
    expect(() => appendEntry([], entry(), 0)).toThrow();
  });
});

describe("parseHistory", () => {
  it("parses valid entries", () => {
    expect(parseHistory([entry()])).toEqual([entry()]);
  });

  it("rejects non-arrays", () => {
    expect(() => parseHistory({})).toThrow("JSON array");
  });

  it("rejects unknown versions", () => {
    expect(() => parseHistory([{ ...entry(), v: 2 }])).toThrow("unsupported version 2");
  });

  it("reports the failing path", () => {
    expect(() => parseHistory([{ ...entry(), url: "nope" }])).toThrow("history entry 0: url");
  });
});

describe("latest", () => {
  it("returns the newest entry for a preset", () => {
    const history = [
      at("aaaaaaa", "2026-01-01T00:00:00Z", "desktop"),
      at("bbbbbbb", "2026-01-02T00:00:00Z"),
    ];
    expect(latest(history)?.sha).toBe("bbbbbbb");
    expect(latest(history, "desktop")?.sha).toBe("aaaaaaa");
    expect(latest([], "mobile")).toBeUndefined();
  });
});
