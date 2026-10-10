import { globSync } from "node:fs";
import type { Bundle } from "@perf-trail/core";
import { BundleError } from "./errors.ts";
import { sizer, sortKeys, sum } from "./size.ts";

export function measureGlob(cwd: string, pattern: string): Bundle {
  const files = globSync(pattern, { cwd }).map((file) => file.split("\\").join("/"));
  if (files.length === 0) throw new BundleError(`glob ${pattern} matched no files in ${cwd}`);
  const size = sizer(cwd);
  const chunks = Object.fromEntries(files.map((file) => [file, size(file)]));
  return { routes: { [pattern]: sum(files, size) }, chunks: sortKeys(chunks) };
}
