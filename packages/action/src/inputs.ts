import { type BundleSpec, parseBundleSpec } from "@perf-trail/bundle";
import type { Preset } from "@perf-trail/core";

export type Inputs = {
  urls: URL[];
  runs: number;
  preset: Preset;
  dataBranch: string;
  maxEntries: number;
  token: string;
  environmentPrefix: string;
  useDeploymentUrl: boolean;
  storeCommitMessage: boolean;
  revalidateUrl?: URL;
  revalidateSecret?: string;
  bundle: BundleSpec | null;
  buildCommand?: string;
  workingDirectory: string;
  budgetsPath?: string;
  bundleChunks?: string;
  failOnBudget: boolean;
  previewComment: boolean;
  previewEnvironmentPrefix: string;
  extraHeaders: Record<string, string>;
};

export type GetInput = (name: string) => string;

export function readInputs(get: GetInput): Inputs {
  const urls = parseUrls(get("urls"));
  const revalidateUrl = optional(get("revalidate-url"));
  const revalidateSecret = optional(get("revalidate-secret"));
  const buildCommand = optional(get("build-command"));
  const budgetsPath = optional(get("budgets"));
  const bundleChunks = optional(get("bundle-chunks"));
  return {
    urls,
    runs: integer(get, "runs", 3, 1, 15),
    preset: preset(get("preset")),
    dataBranch: optional(get("data-branch")) ?? "perf-data",
    maxEntries: integer(get, "max-entries", 300, 1, 10_000),
    token: required(get, "github-token"),
    environmentPrefix: optional(get("environment-prefix")) ?? "Production",
    useDeploymentUrl: boolean(get, "use-deployment-url", false),
    storeCommitMessage: boolean(get, "store-commit-message", true),
    ...(revalidateUrl ? { revalidateUrl: httpUrl(revalidateUrl, "revalidate-url") } : {}),
    ...(revalidateSecret ? { revalidateSecret } : {}),
    bundle: bundleSpec(get("bundle")),
    ...(buildCommand ? { buildCommand } : {}),
    workingDirectory: optional(get("working-directory")) ?? ".",
    ...(budgetsPath ? { budgetsPath } : {}),
    ...(bundleChunks ? { bundleChunks } : {}),
    failOnBudget: boolean(get, "fail-on-budget", true),
    previewComment: boolean(get, "preview-comment", false),
    previewEnvironmentPrefix: optional(get("preview-environment-prefix")) ?? "Preview",
    extraHeaders: headers(get("extra-headers")),
  };
}

export function pageKey(url: URL): string {
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;
  return `${path}${url.search}`;
}

function parseUrls(raw: string): URL[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("Input urls is required: list at least one URL");
  const urls = lines.map((line) => httpUrl(line, "urls"));
  const origins = new Set(urls.map((u) => u.origin));
  if (origins.size > 1) {
    throw new Error(`Input urls must share one origin, got ${[...origins].join(", ")}`);
  }
  const keys = urls.map(pageKey);
  const duplicate = keys.find((key, i) => keys.indexOf(key) !== i);
  if (duplicate) throw new Error(`Input urls lists the page ${duplicate} twice`);
  return urls;
}

function httpUrl(value: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Input ${name}: "${value}" is not a valid URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Input ${name}: "${value}" must use http or https`);
  }
  return url;
}

function preset(value: string): Preset {
  const v = value.trim() || "mobile";
  if (v !== "mobile" && v !== "desktop") {
    throw new Error(`Input preset must be "mobile" or "desktop", got "${v}"`);
  }
  return v;
}

function integer(get: GetInput, name: string, fallback: number, min: number, max: number): number {
  const raw = get(name).trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`Input ${name} must be an integer from ${min} to ${max}, got "${raw}"`);
  }
  return value;
}

function boolean(get: GetInput, name: string, fallback: boolean): boolean {
  const raw = get(name).trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`Input ${name} must be "true" or "false", got "${raw}"`);
}

function required(get: GetInput, name: string): string {
  const value = get(name).trim();
  if (!value) throw new Error(`Input ${name} is required`);
  return value;
}

function optional(value: string): string | undefined {
  return value.trim() || undefined;
}

function bundleSpec(value: string): BundleSpec | null {
  try {
    return parseBundleSpec(value);
  } catch (error) {
    throw new Error(`Input ${error instanceof Error ? error.message : String(error)}`);
  }
}

function headers(raw: string): Record<string, string> {
  const value = raw.trim();
  if (!value) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Input extra-headers must be a JSON object of header names to values");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Input extra-headers must be a JSON object of header names to values");
  }
  const entries = Object.entries(parsed);
  if (entries.some(([, v]) => typeof v !== "string")) {
    throw new Error("Input extra-headers values must be strings");
  }
  return Object.fromEntries(entries) as Record<string, string>;
}
