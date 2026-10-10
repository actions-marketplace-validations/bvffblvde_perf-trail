import { type Entry, formatBytes, rateScore } from "@perf-trail/core";
import { describeSeries, formatValue, seriesFor } from "@perf-trail/react";

const W = 1200;
const H = 400;
const LEFT = 64;
const RIGHT = 1136;
const SCORE_Y = 34;
const PROFILE_TOP = 78;
const PROFILE_BOTTOM = 262;
const BARS_TOP = 288;
const BARS_BOTTOM = 344;
const SHA_Y = 378;

export function DeployTrail({
  history,
  page,
  budget,
  jsBudgetKiB,
}: {
  history: Entry[];
  page: string;
  budget: number;
  jsBudgetKiB: number;
}) {
  const entries = history.filter((e) => e.preset === "mobile" && e.pages[page]);
  const lcp = seriesFor(entries, { metric: "lcp", page });
  if (entries.length === 0) {
    return <p className="trail-empty">The trail starts with the first measured deploy.</p>;
  }
  const lcpMax = Math.max(budget, ...entries.map((e) => e.pages[page]?.metrics.lcp ?? 0)) * 1.12;
  const js = entries.map((e) =>
    e.bundle ? Math.max(...Object.values(e.bundle.routes)) : undefined,
  );
  const jsMax = Math.max(jsBudgetKiB * 1024, ...js.map((v) => v ?? 0));
  const x = (i: number) =>
    entries.length === 1 ? (LEFT + RIGHT) / 2 : LEFT + (i / (entries.length - 1)) * (RIGHT - LEFT);
  const y = (ms: number) => PROFILE_BOTTOM - (ms / lcpMax) * (PROFILE_BOTTOM - PROFILE_TOP);
  const points = entries.map((e, i) => [x(i), y(e.pages[page]?.metrics.lcp ?? 0)] as const);
  const line = points
    .map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`)
    .join("");
  const area = `${line}L${points[points.length - 1]?.[0].toFixed(1)} ${PROFILE_BOTTOM}L${points[0]?.[0].toFixed(1)} ${PROFILE_BOTTOM}Z`;
  const budgetY = y(budget);
  const last = entries.length - 1;
  const lastPoint = points[last] as readonly [number, number];
  const barWidth = Math.min(28, ((RIGHT - LEFT) / Math.max(entries.length, 1)) * 0.5);
  const step = Math.max(1, Math.ceil(entries.length / 14));
  const latestLcp = entries[last]?.pages[page]?.metrics.lcp ?? 0;

  return (
    <div className="trail-scroll">
      <svg
        className="trail"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="trail-title trail-desc"
      >
        <title id="trail-title">
          LCP, Performance score and JS size of this page for every deploy
        </title>
        <desc id="trail-desc">{describeSeries("lcp", lcp, budget)}</desc>
        <defs>
          <linearGradient id="trail-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--trail)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--trail)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <text className="trail-legend" x={8} y={SCORE_Y + 4}>
          Perf
        </text>
        <text className="trail-legend" x={8} y={(PROFILE_TOP + PROFILE_BOTTOM) / 2}>
          LCP
        </text>
        <text className="trail-legend" x={8} y={(BARS_TOP + BARS_BOTTOM) / 2 + 4}>
          JS
        </text>

        <line
          className="trail-ground"
          x1={LEFT - 24}
          x2={RIGHT + 24}
          y1={PROFILE_BOTTOM}
          y2={PROFILE_BOTTOM}
        />
        <line className="trail-budget" x1={LEFT - 24} x2={RIGHT + 24} y1={budgetY} y2={budgetY} />
        <text className="trail-budget-label" x={RIGHT + 24} y={budgetY - 8} textAnchor="end">
          LCP budget {formatValue("lcp", budget)}
        </text>

        <path className="trail-area" d={area} fill="url(#trail-fill)" />
        <path className="trail-line" d={line} />

        {entries.map((entry, i) => {
          const result = entry.pages[page];
          const [px, py] = points[i] as readonly [number, number];
          const score = result?.scores.performance ?? 0;
          const bytes = js[i];
          const barHeight = bytes === undefined ? 0 : (bytes / jsMax) * (BARS_BOTTOM - BARS_TOP);
          const over = (result?.metrics.lcp ?? 0) > budget;
          return (
            <g key={entry.sha} className="trail-stop">
              <title>{`${entry.sha.slice(0, 7)}, ${entry.message ?? ""}\nLCP ${formatValue("lcp", result?.metrics.lcp ?? 0)}, Performance ${score}${bytes === undefined ? "" : `, JS ${formatBytes(bytes)}`}`}</title>
              <line className="trail-tick" x1={px} x2={px} y1={SCORE_Y + 14} y2={BARS_BOTTOM} />
              <g className={`trail-score trail-${rateScore(score)}`}>
                <rect x={px - 17} y={SCORE_Y - 13} width={34} height={22} rx={11} />
                <text x={px} y={SCORE_Y + 3} textAnchor="middle">
                  {score}
                </text>
              </g>
              <circle
                className={over ? "trail-point trail-over" : "trail-point"}
                cx={px}
                cy={py}
                r={i === last ? 7 : 5}
              />
              {bytes === undefined ? null : (
                <rect
                  className={bytes > jsBudgetKiB * 1024 ? "trail-bar trail-over" : "trail-bar"}
                  x={px - barWidth / 2}
                  y={BARS_BOTTOM - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx={3}
                />
              )}
              {i % step === 0 || i === last ? (
                <text className="trail-sha" x={px} y={SHA_Y} textAnchor="middle">
                  {entry.sha.slice(0, 7)}
                </text>
              ) : null}
            </g>
          );
        })}

        <g className="trail-callout">
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r={14} />
          <text x={lastPoint[0] - 22} y={lastPoint[1] + 34} textAnchor="end">
            now {formatValue("lcp", latestLcp)}
          </text>
        </g>
      </svg>
    </div>
  );
}
