import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { BundleError } from "./errors.ts";

export function gzipSize(data: Uint8Array): number {
  return gzipSync(data).length;
}

export function sizer(root: string): (file: string) => number {
  const cache = new Map<string, number>();
  return (file) => {
    const cached = cache.get(file);
    if (cached !== undefined) return cached;
    let data: Buffer;
    try {
      data = readFileSync(join(root, file));
    } catch {
      throw new BundleError(`${file} is referenced by the build but missing in ${root}`);
    }
    const size = gzipSize(data);
    cache.set(file, size);
    return size;
  };
}

export function sum(files: Iterable<string>, size: (file: string) => number): number {
  let total = 0;
  for (const file of files) total += size(file);
  return total;
}

export function sortKeys<T>(record: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}
