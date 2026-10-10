import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Bundle } from "@perf-trail/core";
import { BundleError } from "./errors.ts";
import { sizer, sortKeys, sum } from "./size.ts";

type BuildManifest = { rootMainFiles?: unknown; chunkLoadingGlobal?: unknown };

type ClientReferenceManifest = {
  entryJSFiles?: Record<string, string[]>;
  clientModules?: Record<string, { chunks?: unknown[] }>;
};

const INTERNAL_ROUTES = new Set(["/_not-found", "/_global-error"]);
const STYLESHEET = /\.(css|scss|sass|less)$/;

export function measureNext(dir: string): Bundle {
  const manifest = readJson<BuildManifest>(
    dir,
    "build-manifest.json",
    `no Next.js build in ${dir}: run the build first or set working-directory`,
  );
  if (!Array.isArray(manifest.rootMainFiles) || manifest.rootMainFiles.length === 0) {
    throw unsupported("build-manifest.json has no rootMainFiles");
  }
  const rootMainFiles = manifest.rootMainFiles.map(String);
  const turbopack = manifest.chunkLoadingGlobal === "TURBOPACK";
  const appRoutes = readJson<Record<string, string>>(
    dir,
    "app-path-routes-manifest.json",
    "app-path-routes-manifest.json not found: only the App Router is supported",
  );

  const size = sizer(dir);
  const routes: Record<string, number> = {};
  for (const [entry, route] of Object.entries(appRoutes)) {
    if (!entry.endsWith("/page") || INTERNAL_ROUTES.has(route)) continue;
    const reference = readClientReferenceManifest(dir, entry);
    const files = new Set(rootMainFiles);
    for (const file of turbopack ? turbopackFiles(reference) : webpackFiles(reference)) {
      files.add(file);
    }
    routes[route] = sum(files, size);
  }
  if (Object.keys(routes).length === 0)
    throw new BundleError(`no App Router pages found in ${dir}`);
  return { routes: sortKeys(routes) };
}

function turbopackFiles(reference: ClientReferenceManifest): string[] {
  if (!reference.entryJSFiles) throw unsupported("Turbopack manifest without entryJSFiles");
  return Object.values(reference.entryJSFiles).flat().map(chunkPath);
}

function webpackFiles(reference: ClientReferenceManifest): string[] {
  if (!reference.clientModules) throw unsupported("webpack manifest without clientModules");
  return Object.entries(reference.clientModules)
    .filter(([id]) => !STYLESHEET.test(id))
    .flatMap(([, mod]) => (mod.chunks ?? []).map(String).filter((c) => c.endsWith(".js")))
    .map(chunkPath);
}

function readClientReferenceManifest(dir: string, entry: string): ClientReferenceManifest {
  const file = join("server", "app", `${entry}_client-reference-manifest.js`);
  const path = join(dir, file);
  if (!existsSync(path)) throw unsupported(`${file} not found`);
  const source = readFileSync(path, "utf8");
  const marker = new RegExp(
    `__RSC_MANIFEST\\[${escapeRegExp(JSON.stringify(entry))}\\]\\s*=\\s*`,
  ).exec(source);
  const end = source.lastIndexOf("}");
  if (!marker || end === -1) throw unsupported(`${file} has an unknown format`);
  try {
    return JSON.parse(
      source.slice(marker.index + marker[0].length, end + 1),
    ) as ClientReferenceManifest;
  } catch {
    throw unsupported(`${file} has an unknown format`);
  }
}

function readJson<T>(dir: string, file: string, missing: string): T {
  const path = join(dir, file);
  if (!existsSync(path)) throw new BundleError(missing);
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function chunkPath(file: string): string {
  return file.replace(/^\/?_next\//, "");
}

function unsupported(detail: string): BundleError {
  return new BundleError(
    `unsupported Next.js build output (${detail}). Next.js may have changed its build format; please open an issue`,
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
