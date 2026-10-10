import { describe, expect, it } from "vitest";
import { pageKey, readInputs } from "../src/inputs.ts";

const inputs = (values: Record<string, string>) => (name: string) =>
  ({ "github-token": "t", ...values })[name] ?? "";

describe("readInputs", () => {
  it("applies defaults", () => {
    const result = readInputs(
      inputs({ urls: "https://example.com/en\n\n https://example.com/en/cv " }),
    );
    expect(result).toMatchObject({
      runs: 3,
      preset: "mobile",
      dataBranch: "perf-data",
      maxEntries: 300,
      environmentPrefix: "Production",
      useDeploymentUrl: false,
      storeCommitMessage: true,
    });
    expect(result.urls.map((u) => u.href)).toEqual([
      "https://example.com/en",
      "https://example.com/en/cv",
    ]);
    expect(result.revalidateUrl).toBeUndefined();
  });

  it("reads explicit values", () => {
    const result = readInputs(
      inputs({
        urls: "https://example.com",
        runs: "5",
        preset: "desktop",
        "max-entries": "10",
        "store-commit-message": "false",
        "revalidate-url": "https://example.com/api/revalidate",
        "revalidate-secret": "s",
      }),
    );
    expect(result).toMatchObject({
      runs: 5,
      preset: "desktop",
      maxEntries: 10,
      storeCommitMessage: false,
    });
    expect(result.revalidateUrl?.href).toBe("https://example.com/api/revalidate");
  });

  it.each([
    ["no urls", { urls: " \n " }, "urls is required"],
    ["invalid url", { urls: "example.com" }, "not a valid URL"],
    ["non-http url", { urls: "ftp://example.com" }, "http or https"],
    ["mixed origins", { urls: "https://a.com\nhttps://b.com" }, "one origin"],
    ["duplicate pages", { urls: "https://a.com/x\nhttps://a.com/x/" }, "twice"],
    ["bad runs", { urls: "https://a.com", runs: "0" }, "runs must be"],
    ["bad preset", { urls: "https://a.com", preset: "tablet" }, "preset must be"],
    ["bad boolean", { urls: "https://a.com", "use-deployment-url": "yes" }, "use-deployment-url"],
    ["missing token", { urls: "https://a.com", "github-token": "" }, "github-token is required"],
  ])("rejects %s", (_, values, message) => {
    expect(() => readInputs(inputs(values))).toThrow(message);
  });
});

describe("pageKey", () => {
  it.each([
    ["https://a.com", "/"],
    ["https://a.com/en/", "/en"],
    ["https://a.com/en?x=1", "/en?x=1"],
  ])("%s -> %s", (url, key) => {
    expect(pageKey(new URL(url))).toBe(key);
  });
});
