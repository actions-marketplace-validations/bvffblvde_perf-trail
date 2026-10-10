import { type History, type Preset, rateMetric, rateScore } from "@perf-trail/core";
import { Commit, formatDate } from "./card.tsx";
import { formatValue } from "./series.ts";

export type PerfHistoryTableProps = {
  history: History;
  page?: string;
  preset?: Preset;
  limit?: number;
  repo?: string;
  caption?: string;
  className?: string;
};

export function PerfHistoryTable({
  history,
  page,
  preset = "mobile",
  limit = 10,
  repo,
  caption,
  className,
}: PerfHistoryTableProps) {
  const entries = history.filter((e) => e.preset === preset);
  const rows = entries.slice(-limit).reverse();
  const key = page ?? Object.keys(entries[entries.length - 1]?.pages ?? {})[0];
  const hasBundle = rows.some((e) => e.bundle);
  const classes = ["pt-table", className].filter(Boolean).join(" ");
  if (rows.length === 0 || key === undefined) {
    return <p className={`${classes} pt-empty`}>No deploys measured yet.</p>;
  }
  return (
    <div className={classes}>
      <table>
        <caption>{caption ?? `Last ${rows.length} deploys of ${key}, newest first`}</caption>
        <thead>
          <tr>
            <th scope="col">Commit</th>
            <th scope="col">Date</th>
            <th scope="col">Message</th>
            <th scope="col">Perf</th>
            <th scope="col">LCP</th>
            <th scope="col">CLS</th>
            <th scope="col">TBT</th>
            {hasBundle ? <th scope="col">JS</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const result = entry.pages[key];
            const js = entry.bundle ? Math.max(...Object.values(entry.bundle.routes)) : undefined;
            return (
              <tr key={`${entry.sha}-${entry.preset}`}>
                <th scope="row">
                  <Commit entry={entry} repo={repo} />
                </th>
                <td>
                  <time dateTime={entry.date}>{formatDate(entry.date)}</time>
                </td>
                <td className="pt-message">{entry.message ?? ""}</td>
                {result ? (
                  <>
                    <td className={`pt-${rateScore(result.scores.performance)}`}>
                      {result.scores.performance}
                    </td>
                    <td className={`pt-${rateMetric("lcp", result.metrics.lcp)}`}>
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
                  <td colSpan={4}>not measured</td>
                )}
                {hasBundle ? <td>{js === undefined ? "" : formatValue("js", js)}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
