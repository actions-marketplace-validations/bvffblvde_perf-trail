import {
  type Entry,
  formatBytes,
  formatDelta,
  type History,
  latest,
  type Metrics,
  metricLabels,
  type Preset,
  rateMetric,
  rateScore,
  type Scores,
  scoreKeys,
  scoreLabels,
} from "@perf-trail/core";
import { formatValue } from "./series.ts";

export type LatestDeployCardProps = {
  history: History;
  page?: string;
  preset?: Preset;
  repo?: string;
  className?: string;
};

const CARD_METRICS: (keyof Metrics)[] = ["lcp", "cls", "tbt", "fcp"];

export function LatestDeployCard({
  history,
  page,
  preset = "mobile",
  repo,
  className,
}: LatestDeployCardProps) {
  const entries = history.filter((e) => e.preset === preset);
  const current = latest(entries);
  const classes = ["pt-card", className].filter(Boolean).join(" ");
  if (!current) {
    return (
      <section className={classes} aria-label="Latest deploy">
        <p className="pt-empty">
          No deploys measured yet. The first production deploy after setup appears here.
        </p>
      </section>
    );
  }
  const previous = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const key = page ?? (Object.keys(current.pages)[0] as string);
  const result = current.pages[key];
  const before = previous?.pages[key];
  const largestRoute = largest(current);

  return (
    <section className={classes} aria-label={`Latest deploy of ${key}`}>
      <header className="pt-card-head">
        <Commit entry={current} repo={repo} />
        <time dateTime={current.date}>{formatDate(current.date)}</time>
        {current.message ? <p className="pt-message">{current.message}</p> : null}
      </header>
      {result ? (
        <>
          <dl className="pt-scores">
            {scoreKeys.map((k) => (
              <div key={k} className={`pt-score pt-${rateScore(result.scores[k])}`}>
                <dt>{scoreLabels[k as keyof Scores]}</dt>
                <dd>
                  {result.scores[k]}
                  <Delta
                    value={before ? result.scores[k] - before.scores[k] : undefined}
                    better="up"
                    format={String}
                  />
                </dd>
              </div>
            ))}
          </dl>
          <dl className="pt-metrics">
            {CARD_METRICS.map((k) => (
              <div key={k} className={`pt-metric pt-${rateMetric(k, result.metrics[k])}`}>
                <dt>{metricLabels[k]}</dt>
                <dd>
                  {formatValue(k, result.metrics[k])}
                  <Delta
                    value={before ? result.metrics[k] - before.metrics[k] : undefined}
                    better="down"
                    format={(v) => formatValue(k, v)}
                  />
                </dd>
              </div>
            ))}
            {largestRoute ? (
              <div className="pt-metric">
                <dt>JS on {largestRoute[0]}</dt>
                <dd>
                  {formatBytes(largestRoute[1])}
                  <Delta
                    value={
                      previous?.bundle?.routes[largestRoute[0]] === undefined
                        ? undefined
                        : largestRoute[1] - (previous.bundle.routes[largestRoute[0]] as number)
                    }
                    better="down"
                    format={formatBytes}
                  />
                </dd>
              </div>
            ) : null}
          </dl>
        </>
      ) : (
        <p className="pt-empty">{key} was not measured in this deploy.</p>
      )}
      {current.budgets ? (
        <p className={current.budgets.passed ? "pt-budgets pt-good" : "pt-budgets pt-poor"}>
          {current.budgets.passed
            ? "All budgets passed."
            : `Budgets failed: ${current.budgets.failures.join("; ")}`}
        </p>
      ) : null}
    </section>
  );
}

export function Commit({ entry, repo }: { entry: Entry; repo?: string | undefined }) {
  const sha = <code>{entry.sha.slice(0, 7)}</code>;
  return repo ? (
    <a className="pt-commit" href={`https://github.com/${repo}/commit/${entry.sha}`}>
      {sha}
    </a>
  ) : (
    <span className="pt-commit">{sha}</span>
  );
}

export function Delta({
  value,
  better,
  format,
}: {
  value: number | undefined;
  better: "up" | "down";
  format: (v: number) => string;
}) {
  if (value === undefined || Math.abs(value) < 1e-9) return null;
  const improved = better === "up" ? value > 0 : value < 0;
  return (
    <span className={improved ? "pt-delta pt-improved" : "pt-delta pt-regressed"}>
      {formatDelta(value, format)}
    </span>
  );
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function largest(entry: Entry): [string, number] | undefined {
  const routes = Object.entries(entry.bundle?.routes ?? {});
  return routes.length === 0 ? undefined : routes.reduce((max, r) => (r[1] > max[1] ? r : max));
}
