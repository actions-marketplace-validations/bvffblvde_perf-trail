import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { exec } from "@actions/exec";
import { type PageResult, type Preset, pickMedianRun } from "@perf-trail/core";

export const LIGHTHOUSE_VERSION = "13.5.0";

const CATEGORIES = {
  performance: "performance",
  accessibility: "accessibility",
  bestPractices: "best-practices",
  seo: "seo",
} as const;

const AUDITS = {
  lcp: "largest-contentful-paint",
  cls: "cumulative-layout-shift",
  tbt: "total-blocking-time",
  fcp: "first-contentful-paint",
  si: "speed-index",
} as const;

export type Lhr = {
  runtimeError?: { code?: string; message?: string };
  categories: Record<string, { score: number | null } | undefined>;
  audits: Record<string, { numericValue?: number } | undefined>;
};

export type RunLighthouse = (url: URL, preset: Preset, run: number) => Promise<Lhr>;

export function fromLhr(lhr: Lhr): PageResult {
  if (lhr.runtimeError?.code) {
    throw new Error(
      `Lighthouse failed: ${lhr.runtimeError.code} ${lhr.runtimeError.message ?? ""}`.trim(),
    );
  }
  const score = (id: string) => {
    const value = lhr.categories[id]?.score;
    if (typeof value !== "number") throw new Error(`Lighthouse category "${id}" has no score`);
    return Math.round(value * 100);
  };
  const metric = (id: string) => {
    const value = lhr.audits[id]?.numericValue;
    if (typeof value !== "number") throw new Error(`Lighthouse audit "${id}" is missing`);
    return value;
  };
  return {
    scores: {
      performance: score(CATEGORIES.performance),
      accessibility: score(CATEGORIES.accessibility),
      bestPractices: score(CATEGORIES.bestPractices),
      seo: score(CATEGORIES.seo),
    },
    metrics: {
      lcp: Math.round(metric(AUDITS.lcp)),
      cls: Math.round(metric(AUDITS.cls) * 1000) / 1000,
      tbt: Math.round(metric(AUDITS.tbt)),
      fcp: Math.round(metric(AUDITS.fcp)),
      si: Math.round(metric(AUDITS.si)),
    },
  };
}

export async function measurePage(
  runLighthouse: RunLighthouse,
  url: URL,
  preset: Preset,
  runs: number,
): Promise<{ result: PageResult; runs: PageResult[] }> {
  const results: PageResult[] = [];
  for (let run = 1; run <= runs; run++) {
    results.push(fromLhr(await runLighthouse(url, preset, run)));
  }
  return { result: pickMedianRun(results), runs: results };
}

export async function installLighthouse(dir: string): Promise<RunLighthouse> {
  await exec(
    "npm",
    [
      "install",
      "--no-save",
      "--no-audit",
      "--no-fund",
      "--prefix",
      dir,
      `lighthouse@${LIGHTHOUSE_VERSION}`,
    ],
    { silent: true },
  );
  const cli = join(dir, "node_modules", "lighthouse", "cli", "index.js");
  return async (url, preset, run) => {
    const output = join(dir, `lhr-${encodeURIComponent(url.href)}-${run}.json`);
    await exec(
      "node",
      [
        cli,
        url.href,
        "--output=json",
        `--output-path=${output}`,
        `--only-categories=${Object.values(CATEGORIES).join(",")}`,
        "--chrome-flags=--headless=new --no-sandbox",
        "--quiet",
        ...(preset === "desktop" ? ["--preset=desktop"] : []),
      ],
      { silent: true },
    );
    return JSON.parse(await readFile(output, "utf8")) as Lhr;
  };
}
