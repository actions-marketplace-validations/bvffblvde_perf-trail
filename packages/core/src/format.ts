import type { Metrics, Scores } from "./schema.ts";

export const metricLabels: Record<keyof Metrics, string> = {
  lcp: "LCP",
  cls: "CLS",
  tbt: "TBT",
  fcp: "FCP",
  si: "Speed Index",
};

export const scoreLabels: Record<keyof Scores, string> = {
  performance: "Performance",
  accessibility: "Accessibility",
  bestPractices: "Best practices",
  seo: "SEO",
};

export function formatMetric(key: keyof Metrics, value: number): string {
  if (key === "cls") return trim(value, 3);
  return `${Math.round(value)} ms`;
}

export function formatSeconds(ms: number): string {
  return `${trim(ms / 1000, ms < 10_000 ? 2 : 1)} s`;
}

export function formatBytes(bytes: number): string {
  return `${trim(bytes / 1024, 1)} KiB`;
}

export function formatDelta(value: number, format: (v: number) => string): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${format(Math.abs(value))}`;
}

function trim(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}
