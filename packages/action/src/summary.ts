import {
  type BudgetResult,
  type Entry,
  formatBytes,
  formatDelta,
  formatMetric,
  type Metrics,
  type PageResult,
  type Scores,
} from "@perf-trail/core";

const SCORE_COLUMNS: [keyof Scores, string][] = [
  ["performance", "Perf"],
  ["accessibility", "A11y"],
  ["bestPractices", "BP"],
  ["seo", "SEO"],
];
const METRIC_COLUMNS: [keyof Metrics, string][] = [
  ["lcp", "LCP"],
  ["cls", "CLS"],
  ["tbt", "TBT"],
  ["fcp", "FCP"],
];

export const PREVIEW_HEADING = "### perf-trail preview";

export type SummaryOptions = { preview?: { url: string } };

export function summaryMarkdown(
  entry: Entry,
  previous: Entry | undefined,
  options: SummaryOptions = {},
): string {
  const title = options.preview
    ? `${PREVIEW_HEADING}: ${entry.sha.slice(0, 7)} (${entry.preset})`
    : `### perf-trail: ${entry.sha.slice(0, 7)} (${entry.preset})`;
  const lines = [title, ""];
  if (options.preview) {
    lines.push(
      `Measured on ${options.preview.url}`,
      "",
      "SEO skips the crawlability check here: preview deployments are usually served with noindex.",
      "",
    );
  }
  if (entry.message) lines.push(`> ${entry.message}`, "");
  lines.push(...pagesTable(entry, previous), "");
  if (entry.bundle) lines.push(...bundleTable(entry, previous), "");
  if (entry.budgets) lines.push(...budgetLines(entry.budgets), "");
  lines.push(
    previous
      ? `Deltas compare with ${options.preview ? "production " : ""}${previous.sha.slice(0, 7)} from ${previous.date.slice(0, 10)}.`
      : options.preview
        ? "No production entry yet: nothing to compare with."
        : "First entry: nothing to compare with yet.",
  );
  return `${lines.join("\n")}\n`;
}

function pagesTable(entry: Entry, previous: Entry | undefined): string[] {
  const header = ["Page", ...SCORE_COLUMNS.map(([, l]) => l), ...METRIC_COLUMNS.map(([, l]) => l)];
  const rows = Object.entries(entry.pages).map(([page, result]) => {
    const before = previous?.pages[page];
    return [
      code(page),
      ...SCORE_COLUMNS.map(([key]) => scoreCell(result, before, key)),
      ...METRIC_COLUMNS.map(([key]) => metricCell(result, before, key)),
    ];
  });
  return table(header, rows);
}

function bundleTable(entry: Entry, previous: Entry | undefined): string[] {
  const rows = Object.entries(entry.bundle?.routes ?? {}).map(([route, bytes]) => {
    const before = previous?.bundle?.routes[route];
    return [
      code(route),
      withDelta(
        formatBytes(bytes),
        before === undefined ? undefined : formatDelta(bytes - before, formatBytes),
      ),
    ];
  });
  return table(["Route", "JS (gzip)"], rows);
}

function budgetLines(result: BudgetResult): string[] {
  if (result.passed) return ["**Budgets passed.**"];
  return ["**Budgets failed:**", "", ...result.failures.map((failure) => `- ${failure}`)];
}

function scoreCell(result: PageResult, before: PageResult | undefined, key: keyof Scores): string {
  const value = result.scores[key];
  return withDelta(
    String(value),
    before ? formatDelta(value - before.scores[key], String) : undefined,
  );
}

function metricCell(
  result: PageResult,
  before: PageResult | undefined,
  key: keyof Metrics,
): string {
  const value = result.metrics[key];
  const format = (v: number) => formatMetric(key, v);
  return withDelta(
    format(value),
    before ? formatDelta(value - before.metrics[key], format) : undefined,
  );
}

function withDelta(value: string, delta: string | undefined): string {
  return delta && delta !== "0" ? `${value} (${delta})` : value;
}

function table(header: string[], rows: string[][]): string[] {
  return [row(header), row(header.map(() => "---")), ...rows.map(row)];
}

function row(cells: string[]): string {
  return `| ${cells.join(" | ")} |`;
}

function code(value: string): string {
  return `\`${value.replace(/`/g, "")}\``;
}
