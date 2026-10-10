import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gzipSize, measureNext } from "../src/index.ts";

const fixture = (name: string) => join(import.meta.dirname, "fixtures", name);

function htmlChunks(dir: string, page: string): string[] {
  const html = readFileSync(join(dir, "server/app", `${page}.html`), "utf8");
  const { polyfillFiles } = JSON.parse(readFileSync(join(dir, "build-manifest.json"), "utf8"));
  const refs = new Set([...html.matchAll(/static\/chunks\/[\w./-]+?\.js/g)].map((m) => m[0]));
  for (const file of polyfillFiles) refs.delete(file);
  return [...refs];
}

const gzipTotal = (dir: string, files: string[]) =>
  files.reduce((total, file) => total + gzipSize(readFileSync(join(dir, file))), 0);

describe.each(["next-turbopack", "next-webpack"])("measureNext (%s)", (name) => {
  const dir = fixture(name);
  const bundle = measureNext(dir);

  it("lists App Router pages without internal routes and route handlers", () => {
    expect(Object.keys(bundle.routes)).toEqual(["/", "/about"]);
  });

  it.each([
    ["/", "index"],
    ["/about", "about"],
  ])("matches the scripts the prerendered HTML of %s loads", (route, page) => {
    expect(bundle.routes[route]).toBe(gzipTotal(dir, htmlChunks(dir, page)));
  });

  it("counts the client component chunk only on its page", () => {
    expect(bundle.routes["/about"]).toBeGreaterThan(bundle.routes["/"] as number);
  });
});

describe("measureNext errors", () => {
  const temp = () => mkdtempSync(join(tmpdir(), "perf-trail-next-"));

  it("explains a missing build", () => {
    expect(() => measureNext(temp())).toThrow("run the build first");
  });

  it("rejects the Pages Router", () => {
    const dir = temp();
    writeFileSync(join(dir, "build-manifest.json"), JSON.stringify({ rootMainFiles: ["a.js"] }));
    expect(() => measureNext(dir)).toThrow("only the App Router");
  });

  it("rejects an unknown build manifest", () => {
    const dir = temp();
    writeFileSync(join(dir, "build-manifest.json"), JSON.stringify({ pages: {} }));
    expect(() => measureNext(dir)).toThrow("unsupported Next.js build output");
  });
});
