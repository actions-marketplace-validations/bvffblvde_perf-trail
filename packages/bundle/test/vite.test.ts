import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { entryRoute, gzipSize, measureGlob, measureVite } from "../src/index.ts";

const dir = join(import.meta.dirname, "fixtures", "vite");
const size = (file: string) => gzipSize(readFileSync(join(dir, file)));

describe("measureVite", () => {
  it("sums each entry with its static imports and skips dynamic imports and CSS", () => {
    expect(measureVite(dir)).toEqual({
      routes: {
        "/": size("assets/main-B09EfhTZ.js") + size("assets/shared-BasdbAoA.js"),
        "/about": size("assets/about-BjdwJIjE.js") + size("assets/shared-BasdbAoA.js"),
      },
    });
  });

  it("explains a missing manifest", () => {
    expect(() => measureVite(join(dir, "assets"))).toThrow("build.manifest");
  });
});

describe("entryRoute", () => {
  it.each([
    ["index.html", "/"],
    ["about/index.html", "/about"],
    ["contact.html", "/contact"],
    ["src/main.ts", "src/main.ts"],
  ])("%s -> %s", (src, route) => {
    expect(entryRoute(src)).toBe(route);
  });
});

describe("measureGlob", () => {
  it("reports the total and every file", () => {
    const bundle = measureGlob(dir, "assets/*.js");
    expect(Object.keys(bundle.chunks ?? {})).toHaveLength(4);
    expect(bundle.routes["assets/*.js"]).toBe(
      Object.values(bundle.chunks ?? {}).reduce((a, b) => a + b, 0),
    );
  });

  it("fails when nothing matches", () => {
    expect(() => measureGlob(dir, "nope/*.js")).toThrow("matched no files");
  });
});
