import { describe, expect, it } from "vitest";
import { auditUrls, resolveTarget } from "../src/target.ts";

const deployment = (state: string, environment: string) => ({
  deployment_status: { state, environment_url: "https://app-git-abc.vercel.app" },
  deployment: { sha: "abc1234def", environment },
});

describe("resolveTarget", () => {
  it("measures push and workflow_dispatch at the workflow sha", () => {
    expect(resolveTarget("push", {}, "aaa1111", "Production")).toEqual({
      kind: "measure",
      sha: "aaa1111",
    });
    expect(resolveTarget("workflow_dispatch", {}, "aaa1111", "Production")).toEqual({
      kind: "measure",
      sha: "aaa1111",
    });
  });

  it("measures a successful production deployment at the deployment sha", () => {
    expect(
      resolveTarget("deployment_status", deployment("success", "Production"), "zzz", "Production"),
    ).toEqual({
      kind: "measure",
      sha: "abc1234def",
      deploymentUrl: "https://app-git-abc.vercel.app",
    });
  });

  it("matches environments by prefix", () => {
    const target = resolveTarget(
      "deployment_status",
      deployment("success", "Production my-app"),
      "zzz",
      "Production",
    );
    expect(target.kind).toBe("measure");
  });

  it.each([
    ["pending status", deployment("pending", "Production"), 'status is "pending"'],
    ["failed status", deployment("failure", "Production"), 'status is "failure"'],
    ["preview environment", deployment("success", "Preview"), 'environment "Preview"'],
  ])("skips a %s with a reason", (_, payload, reason) => {
    const target = resolveTarget("deployment_status", payload, "zzz", "Production");
    expect(target.kind).toBe("skip");
    expect(target.kind === "skip" && target.reason).toContain(reason);
  });

  it("skips unsupported events", () => {
    const target = resolveTarget("pull_request", {}, "zzz", "Production");
    expect(target.kind === "skip" && target.reason).toContain("pull_request");
  });
});

describe("auditUrls", () => {
  const urls = [new URL("https://example.com/en"), new URL("https://example.com/en/cv")];

  it("keeps the stable urls by default", () => {
    expect(auditUrls(urls, "https://preview.vercel.app", false)).toBe(urls);
  });

  it("moves pages to the deployment origin when asked", () => {
    expect(auditUrls(urls, "https://preview.vercel.app/x", true).map((u) => u.href)).toEqual([
      "https://preview.vercel.app/en",
      "https://preview.vercel.app/en/cv",
    ]);
  });

  it("falls back to the stable urls without a deployment url", () => {
    expect(auditUrls(urls, undefined, true)).toBe(urls);
  });
});
