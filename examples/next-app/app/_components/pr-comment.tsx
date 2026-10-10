import { type Entry, entryDelta, formatBytes, formatDelta } from "@perf-trail/core";
import { formatValue } from "@perf-trail/react";

export function PrComment({ preview, production }: { preview: Entry; production: Entry }) {
  const deltas = entryDelta(production, preview);
  const routes = Object.entries(preview.bundle?.routes ?? {});
  const cell = (
    value: string,
    delta: number | undefined,
    format: (v: number) => string,
    higherIsBetter = false,
  ) => {
    if (delta === undefined || format(Math.abs(delta)) === format(0)) return <td>{value}</td>;
    const better = higherIsBetter ? delta > 0 : delta < 0;
    return (
      <td>
        {value}{" "}
        <span className={better ? "pr-better" : "pr-worse"}>{formatDelta(delta, format)}</span>
      </td>
    );
  };
  return (
    <article className="pr-comment" aria-label="Example pull request comment">
      <header>
        <span className="pr-avatar" aria-hidden="true" />
        <p>
          <strong>perf-trail</strong> commented on the pull request
        </p>
      </header>
      <div className="pr-body">
        <h3>
          perf-trail preview: <code>{preview.sha.slice(0, 7)}</code> (mobile)
        </h3>
        <div className="pr-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Perf</th>
                <th scope="col">LCP</th>
                <th scope="col">CLS</th>
                <th scope="col">TBT</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(preview.pages).map(([page, result]) => {
                const d = deltas[page];
                return (
                  <tr key={page}>
                    <th scope="row">
                      <code>{page}</code>
                    </th>
                    {cell(String(result.scores.performance), d?.scores.performance, String, true)}
                    {cell(formatValue("lcp", result.metrics.lcp), d?.metrics.lcp, (v) =>
                      formatValue("lcp", v),
                    )}
                    {cell(formatValue("cls", result.metrics.cls), d?.metrics.cls, (v) =>
                      formatValue("cls", v),
                    )}
                    {cell(formatValue("tbt", result.metrics.tbt), d?.metrics.tbt, (v) =>
                      formatValue("tbt", v),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {routes.length > 0 ? (
          <div className="pr-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Route</th>
                  <th scope="col">JS, gzip</th>
                </tr>
              </thead>
              <tbody>
                {routes.map(([route, bytes]) => {
                  const before = production.bundle?.routes[route];
                  return (
                    <tr key={route}>
                      <th scope="row">
                        <code>{route}</code>
                      </th>
                      {cell(
                        formatBytes(bytes),
                        before === undefined ? undefined : bytes - before,
                        formatBytes,
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {preview.budgets ? (
          <p className={preview.budgets.passed ? "pr-pass" : "pr-fail"}>
            {preview.budgets.passed
              ? "Budgets passed."
              : `Budgets failed: ${preview.budgets.failures.join("; ")}`}
          </p>
        ) : null}
        <p className="pr-foot">
          Deltas compare with production <code>{production.sha.slice(0, 7)}</code> from{" "}
          {production.date.slice(0, 10)}.
        </p>
      </div>
    </article>
  );
}
