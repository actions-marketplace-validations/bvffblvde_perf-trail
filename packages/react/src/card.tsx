import {
  type Budgets,
  type Entry,
  formatBytes,
  formatDelta,
  type History,
  latest,
  type Metrics,
  type Preset,
  rateMetric,
  rateScore,
  scoreKeys,
} from "@perf-trail/core";
import { formatDate, type LabelsInput, type PerfLabels, resolveLabels } from "./labels.ts";
import { formatValue } from "./series.ts";

export type LatestDeployCardProps = {
  history: History;
  page?: string;
  pages?: string[];
  jsRoute?: string;
  budgets?: Budgets;
  preset?: Preset;
  repo?: string;
  labels?: LabelsInput;
  title?: string;
  meta?: string;
  showBudgets?: boolean;
  className?: string;
};

const CARD_METRICS: (keyof Metrics)[] = ["lcp", "cls", "tbt", "fcp"];

export function LatestDeployCard({
  history,
  page,
  pages,
  jsRoute,
  budgets,
  preset = "mobile",
  repo,
  labels: labelsInput,
  title,
  meta,
  showBudgets = true,
  className,
}: LatestDeployCardProps) {
  const labels = resolveLabels(labelsInput);
  const entries = history.filter((e) => e.preset === preset);
  const current = latest(entries);
  const classes = ["pt-card", className].filter(Boolean).join(" ");
  if (!current) {
    return (
      <section className={classes} aria-label={labels.latestDeploy(page ?? "")}>
        <p className="pt-empty">{labels.cardEmpty}</p>
      </section>
    );
  }
  const previous = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const key = page ?? pages?.[0] ?? (Object.keys(current.pages)[0] as string);
  const scorePages = pages ?? [key];
  const result = current.pages[key];
  const before = previous?.pages[key];
  const js = jsEntry(current, jsRoute);
  const jsBefore = js ? previous?.bundle?.routes[js[0]] : undefined;
  const pageBudget = { ...budgets?.metrics, ...budgets?.pages?.[key]?.metrics };
  const jsBudget = js ? (budgets?.bundle?.routes?.[js[0]] ?? budgets?.bundle?.maxKiB) : undefined;

  return (
    <section className={classes} aria-label={labels.latestDeploy(key)}>
      <header className="pt-card-head">
        {title ? <h3 className="pt-card-title">{title}</h3> : null}
        {meta ? (
          <p className="pt-meta">{meta}</p>
        ) : (
          <>
            <Commit entry={current} repo={repo} />
            <time dateTime={current.date}>{formatDate(current.date, labels.locale)}</time>
          </>
        )}
        {current.message ? <p className="pt-message">{current.message}</p> : null}
      </header>
      <div className="pt-pages">
        {scorePages.map((p) => {
          const scores = current.pages[p]?.scores;
          const scoresBefore = previous?.pages[p]?.scores;
          if (!scores) return null;
          return (
            <div key={p} className="pt-page">
              {scorePages.length > 1 ? <p className="pt-page-name">{p}</p> : null}
              <dl className="pt-scores">
                {scoreKeys.map((k) => (
                  <div key={k} className={`pt-score pt-${rateScore(scores[k])}`}>
                    <dt>{labels.metrics[k]}</dt>
                    <dd>
                      {scores[k]}
                      <Delta
                        value={scoresBefore ? scores[k] - scoresBefore[k] : undefined}
                        better="up"
                        format={String}
                        labels={labels}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
      {result ? (
        <dl className="pt-metrics">
          {CARD_METRICS.map((k) => (
            <div key={k} className={`pt-metric pt-${rateMetric(k, result.metrics[k])}`}>
              <dt>{scorePages.length > 1 ? `${labels.metrics[k]}, ${key}` : labels.metrics[k]}</dt>
              <dd>
                {formatValue(k, result.metrics[k])}
                <Delta
                  value={before ? result.metrics[k] - before.metrics[k] : undefined}
                  better="down"
                  format={(v) => formatValue(k, v)}
                  labels={labels}
                />
                {pageBudget[k] === undefined ? null : (
                  <span className="pt-limit">
                    {labels.budgetLine(formatValue(k, pageBudget[k]))}
                  </span>
                )}
              </dd>
            </div>
          ))}
          {js ? (
            <div className="pt-metric">
              <dt>{labels.jsOn(js[0])}</dt>
              <dd>
                {formatBytes(js[1])}
                <Delta
                  value={jsBefore === undefined ? undefined : js[1] - jsBefore}
                  better="down"
                  format={formatBytes}
                  labels={labels}
                />
                {jsBudget === undefined ? null : (
                  <span className="pt-limit">{labels.budgetLine(`${jsBudget} KiB`)}</span>
                )}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="pt-empty">{labels.pageNotMeasured(key)}</p>
      )}
      {showBudgets && current.budgets ? (
        <p className={current.budgets.passed ? "pt-budgets pt-good" : "pt-budgets pt-poor"}>
          {current.budgets.passed
            ? labels.budgetsPassed
            : labels.budgetsFailed(current.budgets.failures)}
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
  labels,
}: {
  value: number | undefined;
  better: "up" | "down";
  format: (v: number) => string;
  labels: PerfLabels;
}) {
  if (value === undefined) return null;
  const amount = format(Math.abs(value));
  if (amount === format(0)) return null;
  const improved = better === "up" ? value > 0 : value < 0;
  return (
    <span className={improved ? "pt-delta pt-improved" : "pt-delta pt-regressed"}>
      <span aria-hidden="true">{formatDelta(value, format)}</span>
      <span className="pt-sr">{value > 0 ? labels.deltaUp(amount) : labels.deltaDown(amount)}</span>
    </span>
  );
}

export function jsEntry(entry: Entry, route?: string): [string, number] | undefined {
  const routes = entry.bundle?.routes ?? {};
  if (route) {
    const bytes = routes[route];
    return bytes === undefined ? undefined : [route, bytes];
  }
  const all = Object.entries(routes);
  return all.length === 0 ? undefined : all.reduce((max, r) => (r[1] > max[1] ? r : max));
}
