import { describe, expect, it } from "vitest";
import { parseBundleSpec } from "../src/index.ts";

describe("parseBundleSpec", () => {
  it.each([
    ["", null],
    ["off", null],
    ["next", { kind: "next" }],
    ["vite", { kind: "vite" }],
    ["glob:dist/**/*.js", { kind: "glob", pattern: "dist/**/*.js" }],
  ])("%j", (value, spec) => {
    expect(parseBundleSpec(value)).toEqual(spec);
  });

  it.each(["webpack", "glob:"])("rejects %j", (value) => {
    expect(() => parseBundleSpec(value)).toThrow("unknown bundle");
  });
});
