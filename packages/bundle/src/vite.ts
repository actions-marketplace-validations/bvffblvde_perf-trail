import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Bundle } from "@perf-trail/core";
import { BundleError } from "./errors.ts";
import { sizer, sortKeys, sum } from "./size.ts";

type ManifestChunk = { file: string; src?: string; isEntry?: boolean; imports?: string[] };

export function measureVite(dir: string): Bundle {
  const path = [join(dir, ".vite", "manifest.json"), join(dir, "manifest.json")].find(existsSync);
  if (!path) {
    throw new BundleError(
      `no Vite manifest in ${dir}: set build.manifest to true in vite.config and run the build`,
    );
  }
  const manifest = JSON.parse(readFileSync(path, "utf8")) as Record<string, ManifestChunk>;
  const size = sizer(dir);
  const routes: Record<string, number> = {};
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!chunk.isEntry) continue;
    routes[entryRoute(chunk.src ?? key)] = sum(staticFiles(manifest, key), size);
  }
  if (Object.keys(routes).length === 0)
    throw new BundleError(`no entries in the Vite manifest ${path}`);
  return { routes: sortKeys(routes) };
}

function staticFiles(manifest: Record<string, ManifestChunk>, key: string): Set<string> {
  const files = new Set<string>();
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const chunk = manifest[id];
    if (!chunk) throw new BundleError(`Vite manifest references unknown chunk ${id}`);
    if (chunk.file.endsWith(".js") || chunk.file.endsWith(".mjs")) files.add(chunk.file);
    for (const dep of chunk.imports ?? []) visit(dep);
  };
  visit(key);
  return files;
}

export function entryRoute(src: string): string {
  if (!src.endsWith(".html")) return src;
  const path = src
    .replace(/(^|\/)index\.html$/, "$1")
    .replace(/\.html$/, "")
    .replace(/\/$/, "");
  return `/${path}`;
}
