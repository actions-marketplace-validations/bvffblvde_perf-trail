import {
  type Entry,
  formatBytes,
  formatMetric,
  formatSeconds,
  type History,
  isScoreKey,
  type Metrics,
  metricLabels,
  type Preset,
  type Rating,
  rateMetric,
  rateScore,
  type Scores,
  scoreLabels,
} from "@perf-trail/core";

export type ChartMetric = keyof Metrics | keyof Scores | "js";

export type SeriesOptions = {
  metric: ChartMetric;
  page?: string;
  route?: string;
  preset?: Preset;
};

export type Point = { entry: Entry; value: number };

export function seriesFor(history: History, options: SeriesOptions): Point[] {
  const { metric, preset = "mobile" } = options;
  const points: Point[] = [];
  for (const entry of history) {
    if (entry.preset !== preset) continue;
    const value = pointValue(entry, options);
    if (value !== undefined) points.push({ entry, value });
  }
  return metric === "js" || isScoreKey(metric) || metric in metricLabels ? points : [];
}

export function pointValue(
  entry: Entry,
  { metric, page, route }: SeriesOptions,
): number | undefined {
  if (metric === "js") {
    const routes = entry.bundle?.routes;
    if (!routes) return undefined;
    return route ? routes[route] : Math.max(...Object.values(routes));
  }
  const result = page ? entry.pages[page] : Object.values(entry.pages)[0];
  if (!result) return undefined;
  return isScoreKey(metric) ? result.scores[metric] : result.metrics[metric];
}

export function higherIsBetter(metric: ChartMetric): boolean {
  return isScoreKey(metric);
}

export function labelOf(metric: ChartMetric): string {
  if (metric === "js") return "JS (gzip)";
  return isScoreKey(metric) ? scoreLabels[metric] : metricLabels[metric];
}

export function formatValue(metric: ChartMetric, value: number): string {
  if (metric === "js") return formatBytes(value);
  if (isScoreKey(metric)) return String(value);
  if (metric === "lcp" || metric === "fcp" || metric === "si") return formatSeconds(value);
  return formatMetric(metric, value);
}

export function rate(metric: ChartMetric, value: number, budget?: number): Rating | undefined {
  if (metric === "js") return budget === undefined ? undefined : value <= budget ? "good" : "poor";
  return isScoreKey(metric) ? rateScore(value) : rateMetric(metric, value);
}

export function breaches(metric: ChartMetric, value: number, budget: number | undefined): boolean {
  if (budget === undefined) return false;
  return higherIsBetter(metric) ? value < budget : value > budget;
}

export function niceStep(range: number, count: number): number {
  const raw = range / Math.max(count, 1);
  const power = 10 ** Math.floor(Math.log10(raw || 1));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

export function niceTicks(min: number, max: number, count = 4): number[] {
  const step = niceStep(max - min, count);
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= max + step * 1e-9; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }
  return ticks;
}

export function domainFor(
  metric: ChartMetric,
  values: number[],
  budget?: number,
): [number, number] {
  const all = budget === undefined ? values : [...values, budget];
  if (higherIsBetter(metric)) {
    const low = Math.min(...all);
    const step = niceStep(100 - Math.min(low, 95), 4);
    return [Math.max(0, Math.floor((Math.min(low, 95) - step / 2) / step) * step), 100];
  }
  const high = Math.max(...all, metric === "cls" ? 0.01 : 1) * 1.15;
  const ticks = niceTicks(0, high, 4);
  return [0, ticks[ticks.length - 1] as number];
}
