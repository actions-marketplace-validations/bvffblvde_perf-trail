import { type History, type Preset, rateMetric, rateScore } from "@perf-trail/core";
import { Commit, jsEntry } from "./card.tsx";
import { formatDate, type LabelsInput, resolveLabels } from "./labels.ts";
import { formatValue } from "./series.ts";

export type PerfHistoryTableProps = {
  history: History;
  page?: string;
  jsRoute?: string;
  preset?: Preset;
  limit?: number;
  repo?: string;
  caption?: string;
  labels?: LabelsInput;
  className?: string;
};

export function PerfHistoryTable({
  history,
  page,
  jsRoute,
  preset = "mobile",
  limit = 10,
  repo,
  caption,
  labels: labelsInput,
  className,
}: PerfHistoryTableProps) {
  const labels = resolveLabels(labelsInput);
  const entries = history.filter((e) => e.preset === preset);
  const rows = entries.slice(-limit).reverse();
  const key = page ?? Object.keys(entries[entries.length - 1]?.pages ?? {})[0];
  const hasBundle = rows.some((e) => e.bundle);
  const hasBudgets = rows.some((e) => e.budgets);
  const classes = ["pt-table", className].filter(Boolean).join(" ");
  if (rows.length === 0 || key === undefined) {
    return <p className={`${classes} pt-empty`}>{labels.empty}</p>;
  }
  const { columns } = labels;
  return (
    <div className={classes}>
      <table>
        <caption>{caption ?? labels.tableCaption(rows.length, key)}</caption>
        <thead>
          <tr>
            <th scope="col">{columns.commit}</th>
            <th scope="col">{columns.date}</th>
            <th scope="col">{columns.message}</th>
            <th scope="col">{columns.performance}</th>
            <th scope="col">{columns.lcp}</th>
            <th scope="col">{columns.cls}</th>
            <th scope="col">{columns.tbt}</th>
            {hasBundle ? <th scope="col">{columns.js}</th> : null}
            {hasBudgets ? <th scope="col">{columns.budgets}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const result = entry.pages[key];
            const js = jsEntry(entry, jsRoute);
            return (
              <tr key={`${entry.sha}-${entry.preset}`} data-sha={entry.sha.slice(0, 7)}>
                <th scope="row">
                  <Commit entry={entry} repo={repo} />
                </th>
                <td>
                  <time dateTime={entry.date}>{formatDate(entry.date, labels.locale)}</time>
                </td>
                <td className="pt-message">{entry.message ?? ""}</td>
                {result ? (
                  <>
                    <td className={`pt-${rateScore(result.scores.performance)}`}>
                      {result.scores.performance}
                    </td>
                    <td className={`pt-${rateMetric("lcp", result.metrics.lcp)}`} data-col="lcp">
                      {formatValue("lcp", result.metrics.lcp)}
                    </td>
                    <td className={`pt-${rateMetric("cls", result.metrics.cls)}`}>
                      {formatValue("cls", result.metrics.cls)}
                    </td>
                    <td className={`pt-${rateMetric("tbt", result.metrics.tbt)}`}>
                      {formatValue("tbt", result.metrics.tbt)}
                    </td>
                  </>
                ) : (
                  <td colSpan={4}>{labels.notMeasured}</td>
                )}
                {hasBundle ? <td data-col="js">{js ? formatValue("js", js[1]) : ""}</td> : null}
                {hasBudgets ? (
                  <td className={entry.budgets?.passed === false ? "pt-poor" : undefined}>
                    {entry.budgets ? (entry.budgets.passed ? labels.passed : labels.failed) : ""}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
