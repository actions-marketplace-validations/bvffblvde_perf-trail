import type { Metrics, Scores } from "./schema.ts";

export type Rating = "good" | "average" | "poor";

const METRIC_THRESHOLDS: Record<keyof Metrics, [number, number]> = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  tbt: [200, 600],
  fcp: [1800, 3000],
  si: [3400, 5800],
};

export function rateScore(score: number): Rating {
  return score >= 90 ? "good" : score >= 50 ? "average" : "poor";
}

export function rateMetric(key: keyof Metrics, value: number): Rating {
  const [good, average] = METRIC_THRESHOLDS[key];
  return value <= good ? "good" : value <= average ? "average" : "poor";
}

export function isScoreKey(key: string): key is keyof Scores {
  return (
    key === "performance" || key === "accessibility" || key === "bestPractices" || key === "seo"
  );
}
