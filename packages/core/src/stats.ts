import {
  type Entry,
  type Metrics,
  metricKeys,
  type PageResult,
  type Scores,
  scoreKeys,
} from "./schema.ts";

export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("median of an empty list");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export function pickMedianRun<T extends PageResult>(runs: readonly T[]): T {
  if (runs.length === 0) throw new Error("no runs to pick from");
  const lcp = median(runs.map((r) => r.metrics.lcp));
  const fcp = median(runs.map((r) => r.metrics.fcp));
  const distance = (r: T) =>
    ((r.metrics.lcp - lcp) / Math.max(lcp, 1)) ** 2 +
    ((r.metrics.fcp - fcp) / Math.max(fcp, 1)) ** 2;
  return runs.reduce((best, run) => (distance(run) < distance(best) ? run : best));
}

export type PageDelta = { scores: Scores; metrics: Metrics };

export function pageDelta(prev: PageResult, next: PageResult): PageDelta {
  const scores = Object.fromEntries(
    scoreKeys.map((k) => [k, next.scores[k] - prev.scores[k]]),
  ) as Scores;
  const metrics = Object.fromEntries(
    metricKeys.map((k) => [k, round(next.metrics[k] - prev.metrics[k])]),
  ) as Metrics;
  return { scores, metrics };
}

export function entryDelta(prev: Entry, next: Entry): Record<string, PageDelta> {
  const out: Record<string, PageDelta> = {};
  for (const [page, result] of Object.entries(next.pages)) {
    const before = prev.pages[page];
    if (before) out[page] = pageDelta(before, result);
  }
  return out;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
