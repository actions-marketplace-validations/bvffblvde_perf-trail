import type { Entry } from "@perf-trail/core";
import { describe, expect, it } from "vitest";
import { saveEntry } from "../src/store.ts";
import { fakeGitHub } from "./fake-github.ts";

const entry = (sha: string, date: string): Entry => ({
  v: 1,
  sha,
  date,
  url: "https://example.com",
  preset: "mobile",
  pages: {
    "/": {
      scores: { performance: 90, accessibility: 100, bestPractices: 100, seo: 100 },
      metrics: { lcp: 2000, cls: 0, tbt: 10, fcp: 900, si: 1000 },
    },
  },
});

const first = entry("aaaaaaa", "2026-10-01T00:00:00.000Z");
const second = entry("bbbbbbb", "2026-10-02T00:00:00.000Z");

describe("saveEntry", () => {
  it("creates the data branch with history and vercel.json", async () => {
    const gh = fakeGitHub();
    const result = await saveEntry(gh.api, { branch: "perf-data", entry: first, maxEntries: 300 });
    expect(result).toEqual({ history: [first], previous: undefined });
    expect(gh.commits[0]?.parent).toBeNull();
    expect(gh.commits[0]?.message).toBe("perf-trail: record aaaaaaa (mobile)");
    const files = gh.branches.get("perf-data")?.files ?? {};
    expect(JSON.parse(files["history.json"] ?? "")).toEqual([first]);
    expect(JSON.parse(files["vercel.json"] ?? "")).toEqual({ git: { deploymentEnabled: false } });
  });

  it("appends to existing history and returns the previous entry", async () => {
    const gh = fakeGitHub({
      "perf-data": { head: "h1", files: { "history.json": JSON.stringify([first]) } },
    });
    const result = await saveEntry(gh.api, { branch: "perf-data", entry: second, maxEntries: 300 });
    expect(result.history.map((e) => e.sha)).toEqual(["aaaaaaa", "bbbbbbb"]);
    expect(result.previous?.sha).toBe("aaaaaaa");
    expect(gh.commits[0]?.parent).toBe("h1");
    expect(Object.keys(gh.commits[0]?.files ?? {})).toEqual(["history.json"]);
  });

  it("does not compare a re-run with itself", async () => {
    const gh = fakeGitHub({
      "perf-data": { head: "h1", files: { "history.json": JSON.stringify([first, second]) } },
    });
    const result = await saveEntry(gh.api, { branch: "perf-data", entry: second, maxEntries: 300 });
    expect(result.history).toHaveLength(2);
    expect(result.previous?.sha).toBe("aaaaaaa");
  });

  it("retries after a concurrent update", async () => {
    const gh = fakeGitHub({ "perf-data": { head: "h1", files: { "history.json": "[]" } } });
    gh.failNextCommits(2);
    await saveEntry(gh.api, { branch: "perf-data", entry: first, maxEntries: 300 });
    expect(gh.commits).toHaveLength(3);
  });

  it("gives up after the last attempt", async () => {
    const gh = fakeGitHub();
    gh.failNextCommits(3);
    await expect(
      saveEntry(gh.api, { branch: "perf-data", entry: first, maxEntries: 300 }),
    ).rejects.toThrow("kept changing");
  });

  it("refuses to overwrite a file in another format", async () => {
    const gh = fakeGitHub({
      "perf-data": {
        head: "h1",
        files: { "history.json": JSON.stringify([{ sha: "x", deployUrl: "y" }]) },
      },
    });
    await expect(
      saveEntry(gh.api, { branch: "perf-data", entry: first, maxEntries: 300 }),
    ).rejects.toThrow("refusing to overwrite");
    expect(gh.commits).toHaveLength(0);
  });
});
