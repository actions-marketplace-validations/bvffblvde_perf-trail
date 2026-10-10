import {
  type Entry,
  entryDelta,
  formatBytes,
  formatDelta,
  rateMetric,
  rateScore,
} from "@perf-trail/core";
import { formatValue } from "@perf-trail/react";

type Stat = { label: string; value: string; delta?: string; better?: boolean; rating?: string };

export function LatestStats({
  current,
  previous,
  page,
}: {
  current: Entry;
  previous?: Entry;
  page: string;
}) {
  const result = current.pages[page];
  if (!result) return null;
  const delta = previous ? entryDelta(previous, current)[page] : undefined;
  const js = current.bundle ? Math.max(...Object.values(current.bundle.routes)) : undefined;
  const jsBefore = previous?.bundle
    ? Math.max(...Object.values(previous.bundle.routes))
    : undefined;
  const signed = (value: number | undefined, format: (v: number) => string) =>
    value === undefined || format(Math.abs(value)) === format(0)
      ? undefined
      : formatDelta(value, format);
  const stats: Stat[] = [
    {
      label: "Performance",
      value: String(result.scores.performance),
      rating: rateScore(result.scores.performance),
      ...withDelta(signed(delta?.scores.performance, String), (delta?.scores.performance ?? 0) > 0),
    },
    {
      label: "LCP",
      value: formatValue("lcp", result.metrics.lcp),
      rating: rateMetric("lcp", result.metrics.lcp),
      ...withDelta(
        signed(delta?.metrics.lcp, (v) => formatValue("lcp", v)),
        (delta?.metrics.lcp ?? 0) < 0,
      ),
    },
    {
      label: "TBT",
      value: formatValue("tbt", result.metrics.tbt),
      rating: rateMetric("tbt", result.metrics.tbt),
      ...withDelta(
        signed(delta?.metrics.tbt, (v) => formatValue("tbt", v)),
        (delta?.metrics.tbt ?? 0) < 0,
      ),
    },
    ...(js === undefined
      ? []
      : [
          {
            label: "JS, gzip",
            value: formatBytes(js),
            ...withDelta(
              signed(jsBefore === undefined ? undefined : js - jsBefore, formatBytes),
              js < (jsBefore ?? js),
            ),
          },
        ]),
  ];
  return (
    <dl className="stats">
      {stats.map((stat) => (
        <div key={stat.label} className={stat.rating ? `stat stat-${stat.rating}` : "stat"}>
          <dt>{stat.label}</dt>
          <dd>
            <span className="stat-value">{stat.value}</span>
            {stat.delta ? (
              <span className={stat.better ? "stat-delta stat-better" : "stat-delta stat-worse"}>
                {stat.delta}
              </span>
            ) : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function withDelta(delta: string | undefined, better: boolean): Pick<Stat, "delta" | "better"> {
  return delta ? { delta, better } : {};
}
