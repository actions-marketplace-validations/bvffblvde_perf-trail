import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Lhr } from "../src/lighthouse.ts";
import { type FakeBranch, fakeGitHub } from "./fake-github.ts";

const state = vi.hoisted(() => ({
  inputs: {} as Record<string, string>,
  outputs: {} as Record<string, string>,
  logs: [] as string[],
  warnings: [] as string[],
  failed: undefined as string | undefined,
  context: { eventName: "", payload: {} as unknown, sha: "", repo: { owner: "o", repo: "r" } },
  audited: [] as string[],
  branches: {} as Record<string, FakeBranch>,
}));

vi.mock("@actions/core", () => ({
  getInput: (name: string) => state.inputs[name] ?? "",
  setOutput: (name: string, value: string) => {
    state.outputs[name] = value;
  },
  info: (message: string) => state.logs.push(message),
  warning: (message: string) => state.warnings.push(message),
  setFailed: (message: string) => {
    state.failed = message;
  },
  group: async <T>(_name: string, fn: () => Promise<T>) => fn(),
}));

vi.mock("@actions/github", () => ({
  context: state.context,
}));

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/lhr-example-com.json", import.meta.url), "utf8"),
) as Lhr;

vi.mock("../src/lighthouse.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("../src/lighthouse.ts")>();
  return {
    ...original,
    installLighthouse: async () => async (url: URL) => {
      state.audited.push(url.href);
      return fixture;
    },
  };
});

const gh = vi.hoisted(() => ({ current: undefined as ReturnType<typeof fakeGitHub> | undefined }));

vi.mock("../src/github.ts", () => ({
  createGitHubApi: () => gh.current?.api,
}));

const { run } = await import("../src/main.ts");

const SHA = "abcdef1234567890";

beforeEach(() => {
  state.inputs = {
    urls: "https://example.com/en\nhttps://example.com/en/cv",
    runs: "2",
    "github-token": "t",
  };
  state.outputs = {};
  state.logs = [];
  state.warnings = [];
  state.failed = undefined;
  state.audited = [];
  Object.assign(state.context, { eventName: "workflow_dispatch", payload: {}, sha: SHA });
  gh.current = fakeGitHub();
});

const savedHistory = () =>
  JSON.parse(gh.current?.branches.get("perf-data")?.files["history.json"] ?? "null") as unknown[];

describe("run", () => {
  it("measures every url and saves an entry", async () => {
    await run();
    expect(state.failed).toBeUndefined();
    expect(state.audited).toEqual([
      "https://example.com/en",
      "https://example.com/en",
      "https://example.com/en/cv",
      "https://example.com/en/cv",
    ]);
    expect(savedHistory()).toEqual([
      {
        v: 1,
        sha: SHA,
        date: "2026-10-01T08:00:00.000Z",
        message: "feat: change abcdef1",
        url: "https://example.com",
        preset: "mobile",
        pages: {
          "/en": expect.objectContaining({ scores: expect.objectContaining({ performance: 93 }) }),
          "/en/cv": expect.objectContaining({ metrics: expect.objectContaining({ lcp: 962 }) }),
        },
      },
    ]);
    expect(state.outputs.skipped).toBe("false");
    expect(JSON.parse(state.outputs["entry-json"] ?? "{}").sha).toBe(SHA);
  });

  it("omits the commit message when asked", async () => {
    state.inputs["store-commit-message"] = "false";
    await run();
    expect(savedHistory()[0]).not.toHaveProperty("message");
  });

  it("skips a preview deployment with a log line", async () => {
    Object.assign(state.context, {
      eventName: "deployment_status",
      payload: {
        deployment_status: { state: "success" },
        deployment: { sha: SHA, environment: "Preview" },
      },
    });
    await run();
    expect(state.outputs.skipped).toBe("true");
    expect(state.logs.join("\n")).toContain('perf-trail: skipped, environment "Preview"');
    expect(state.audited).toEqual([]);
    expect(gh.current?.commits).toEqual([]);
  });

  it("fails on invalid inputs", async () => {
    state.inputs.preset = "tablet";
    await run();
    expect(state.failed).toContain("preset");
  });

  it("warns but does not fail when revalidation fails", async () => {
    state.inputs["revalidate-url"] = "https://example.com/api/revalidate";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status: 500 }));
    await run();
    fetchSpy.mockRestore();
    expect(state.failed).toBeUndefined();
    expect(state.warnings.join("\n")).toContain("HTTP 500");
    expect(savedHistory()).toHaveLength(1);
  });
});
