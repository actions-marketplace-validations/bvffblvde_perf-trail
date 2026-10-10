import type { ChartMetric } from "./series.ts";

export type SeriesSummary = {
  metric: ChartMetric;
  label: string;
  count: number;
  first: string;
  last: string;
  best: string;
  budget?: string;
  over: number;
};

export type PerfLabels = {
  locale: string;
  metrics: Record<ChartMetric, string>;
  columns: {
    commit: string;
    date: string;
    message: string;
    performance: string;
    lcp: string;
    cls: string;
    tbt: string;
    js: string;
    budgets: string;
  };
  empty: string;
  cardEmpty: string;
  latestDeploy: (page: string) => string;
  chartTitle: (metric: string, subject: string | undefined) => string;
  summary: (summary: SeriesSummary) => string;
  budgetLine: (value: string) => string;
  point: (point: { sha: string; date: string; value: string }) => string;
  tooltipHint: string;
  pageNotMeasured: (page: string) => string;
  notMeasured: string;
  budgetsPassed: string;
  budgetsFailed: (failures: string[]) => string;
  passed: string;
  failed: string;
  jsOn: (route: string) => string;
  deltaUp: (value: string) => string;
  deltaDown: (value: string) => string;
  tableCaption: (count: number, page: string) => string;
};

export const defaultLabels: PerfLabels = {
  locale: "en",
  metrics: {
    performance: "Performance",
    accessibility: "Accessibility",
    bestPractices: "Best practices",
    seo: "SEO",
    lcp: "LCP",
    cls: "CLS",
    tbt: "TBT",
    fcp: "FCP",
    si: "Speed Index",
    js: "JS (gzip)",
  },
  columns: {
    commit: "Commit",
    date: "Date",
    message: "Message",
    performance: "Perf",
    lcp: "LCP",
    cls: "CLS",
    tbt: "TBT",
    js: "JS",
    budgets: "Budgets",
  },
  empty: "No deploys measured yet",
  cardEmpty: "No deploys measured yet. The first production deploy after setup appears here.",
  latestDeploy: (page) => `Latest deploy of ${page}`,
  chartTitle: (metric, subject) => (subject ? `${metric} on ${subject}` : metric),
  summary: ({ label, count, first, last, best, budget, over }) => {
    const trend =
      count === 1
        ? `${label} ${last} on the only measured deploy.`
        : `${label} went from ${first} to ${last} over ${count} deploys, best ${best}.`;
    if (budget === undefined) return trend;
    return over === 0
      ? `${trend} All within the ${budget} budget.`
      : `${trend} ${over} of ${count} outside the ${budget} budget.`;
  },
  budgetLine: (value) => `budget ${value}`,
  point: ({ sha, date, value }) => `${date}, ${sha}: ${value}`,
  tooltipHint: "Use the arrow keys to move between deploys.",
  pageNotMeasured: (page) => `${page} was not measured in this deploy.`,
  notMeasured: "not measured",
  budgetsPassed: "All budgets passed.",
  budgetsFailed: (failures) => `Budgets failed: ${failures.join("; ")}`,
  passed: "passed",
  failed: "failed",
  jsOn: (route) => `JS on ${route}`,
  deltaUp: (value) => `up by ${value}`,
  deltaDown: (value) => `down by ${value}`,
  tableCaption: (count, page) => `Last ${count} deploys of ${page}, newest first`,
};

export type LabelsInput = Partial<Omit<PerfLabels, "metrics" | "columns">> & {
  metrics?: Partial<PerfLabels["metrics"]>;
  columns?: Partial<PerfLabels["columns"]>;
};

export function resolveLabels(input: LabelsInput | undefined): PerfLabels {
  if (!input) return defaultLabels;
  return {
    ...defaultLabels,
    ...input,
    metrics: { ...defaultLabels.metrics, ...input.metrics },
    columns: { ...defaultLabels.columns, ...input.columns },
  } as PerfLabels;
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
