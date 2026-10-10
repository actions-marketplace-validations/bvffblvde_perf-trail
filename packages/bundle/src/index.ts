import { join } from "node:path";
import type { Bundle } from "@perf-trail/core";
import { BundleError } from "./errors.ts";
import { measureGlob } from "./glob.ts";
import { measureNext } from "./next.ts";
import { measureVite } from "./vite.ts";

export { BundleError } from "./errors.ts";
export { measureGlob } from "./glob.ts";
export { measureNext } from "./next.ts";
export { gzipSize } from "./size.ts";
export { entryRoute, measureVite } from "./vite.ts";

export type BundleSpec = { kind: "next" } | { kind: "vite" } | { kind: "glob"; pattern: string };

export function parseBundleSpec(value: string): BundleSpec | null {
  const v = value.trim();
  if (v === "" || v === "off") return null;
  if (v === "next" || v === "vite") return { kind: v };
  if (v.startsWith("glob:") && v.length > 5) return { kind: "glob", pattern: v.slice(5) };
  throw new BundleError(`unknown bundle "${v}": use next, vite, glob:<pattern> or off`);
}

export function measureBundle(spec: BundleSpec, cwd: string): Bundle {
  switch (spec.kind) {
    case "next":
      return measureNext(join(cwd, ".next"));
    case "vite":
      return measureVite(join(cwd, "dist"));
    case "glob":
      return measureGlob(cwd, spec.pattern);
  }
}
