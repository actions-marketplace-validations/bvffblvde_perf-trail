import { describe, expect, it, vi } from "vitest";
import { fetchHistory, HistoryError, historyUrl } from "../src/index.ts";

const entry = {
  v: 1,
  sha: "abcdef1",
  date: "2026-10-01T00:00:00.000Z",
  url: "https://example.com",
  preset: "mobile",
  pages: {
    "/": {
      scores: { performance: 99, accessibility: 100, bestPractices: 100, seo: 100 },
      metrics: { lcp: 1200, cls: 0, tbt: 10, fcp: 800, si: 900 },
    },
  },
};

const respond = (body: unknown, status = 200) =>
  vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );

describe("historyUrl", () => {
  it("uses raw.githubusercontent.com for public repos", () => {
    expect(historyUrl({ repo: "o/r" })).toBe(
      "https://raw.githubusercontent.com/o/r/perf-data/history.json",
    );
  });

  it("uses the contents API with a token", () => {
    expect(historyUrl({ repo: "o/r", branch: "data", token: "t" })).toBe(
      "https://api.github.com/repos/o/r/contents/history.json?ref=data",
    );
  });

  it("rejects malformed repos", () => {
    expect(() => historyUrl({ repo: "o/r/x" })).toThrow(HistoryError);
  });
});

describe("fetchHistory", () => {
  it("parses a public history and passes init through", async () => {
    const fetchImpl = respond([entry]);
    const history = await fetchHistory({
      repo: "o/r",
      fetch: fetchImpl,
      init: { cache: "force-cache" },
    });
    expect(history).toEqual([entry]);
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({ cache: "force-cache" });
  });

  it("sends the token to the GitHub API", async () => {
    const fetchImpl = respond([entry]);
    await fetchHistory({ repo: "o/r", token: "secret", fetch: fetchImpl });
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret");
    expect(headers.get("Accept")).toBe("application/vnd.github.raw+json");
  });

  it("returns an empty history before the first run", async () => {
    expect(await fetchHistory({ repo: "o/r", fetch: respond("", 404) })).toEqual([]);
  });

  it("throws with the status on other errors", async () => {
    await expect(fetchHistory({ repo: "o/r", fetch: respond("", 403) })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("validates the data", async () => {
    await expect(fetchHistory({ repo: "o/r", fetch: respond([{ v: 2 }]) })).rejects.toThrow(
      "unsupported version",
    );
  });
});
