import type { History, Preset } from "@perf-trail/core";
import {
  breaches,
  type ChartMetric,
  domainFor,
  formatValue,
  higherIsBetter,
  labelOf,
  niceTicks,
  type Point,
  seriesFor,
} from "./series.ts";

export type PerfHistoryChartProps = {
  history: History;
  metric: ChartMetric;
  page?: string;
  route?: string;
  preset?: Preset;
  budget?: number;
  title?: string;
  width?: number;
  height?: number;
  showCaption?: boolean;
  className?: string;
};

const MARGIN = { top: 16, right: 16, bottom: 30, left: 52 };
const MAX_MARKERS = 60;

export function PerfHistoryChart({
  history,
  metric,
  page,
  route,
  preset = "mobile",
  budget,
  title,
  width = 640,
  height = 240,
  showCaption = true,
  className,
}: PerfHistoryChartProps) {
  const points = seriesFor(history, {
    metric,
    ...(page ? { page } : {}),
    ...(route ? { route } : {}),
    preset,
  });
  const subject = page ?? route;
  const heading = title ?? `${labelOf(metric)}${subject ? ` on ${subject}` : ""}`;
  const id = `pt-${metric}-${slug(subject ?? "all")}-${preset}`;
  const summary = describe(metric, points, budget);
  const classes = ["pt-chart", className].filter(Boolean).join(" ");

  return (
    <figure className={classes} data-metric={metric}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{heading}</title>
        <desc id={`${id}-desc`}>{summary}</desc>
        {points.length === 0 ? (
          <text className="pt-empty" x={width / 2} y={height / 2} textAnchor="middle">
            No deploys measured yet
          </text>
        ) : (
          <Plot points={points} metric={metric} budget={budget} width={width} height={height} />
        )}
      </svg>
      {showCaption ? <figcaption>{summary}</figcaption> : null}
    </figure>
  );
}

function Plot({
  points,
  metric,
  budget,
  width,
  height,
}: {
  points: Point[];
  metric: ChartMetric;
  budget: number | undefined;
  width: number;
  height: number;
}) {
  const [low, high] = domainFor(
    metric,
    points.map((p) => p.value),
    budget,
  );
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const x = (i: number) =>
    MARGIN.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (value: number) => MARGIN.top + (1 - (value - low) / (high - low || 1)) * plotHeight;
  const ticks = niceTicks(low, high, 4).filter((t) => t >= low && t <= high);
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${round(x(i))} ${round(y(p.value))}`)
    .join("");
  const baseline = round(y(low));
  const area = `${line}L${round(x(points.length - 1))} ${baseline}L${round(x(0))} ${baseline}Z`;
  const showAll = points.length <= MAX_MARKERS;
  const last = points.length - 1;
  const xLabels = points.length === 1 ? [0] : [0, last];

  return (
    <>
      <g className="pt-grid">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={round(y(tick))}
              y2={round(y(tick))}
            />
            <text x={MARGIN.left - 8} y={round(y(tick))} dy="0.32em" textAnchor="end">
              {formatValue(metric, tick)}
            </text>
          </g>
        ))}
      </g>
      <g className="pt-axis">
        {xLabels.map((i) => (
          <text
            key={i}
            x={round(x(i))}
            y={height - 8}
            textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : "end"}
          >
            {(points[i] as Point).entry.sha.slice(0, 7)}
          </text>
        ))}
      </g>
      {budget !== undefined && budget >= low && budget <= high ? (
        <g className="pt-budget">
          <line
            x1={MARGIN.left}
            x2={width - MARGIN.right}
            y1={round(y(budget))}
            y2={round(y(budget))}
          />
          <text x={width - MARGIN.right} y={round(y(budget)) - 6} textAnchor="end">
            budget {formatValue(metric, budget)}
          </text>
        </g>
      ) : null}
      {points.length > 1 ? <path className="pt-area" d={area} /> : null}
      <path className="pt-line" d={line} />
      <g className="pt-points">
        {points.map((point, i) => {
          const breach = breaches(metric, point.value, budget);
          if (!showAll && !breach && i !== last) return null;
          return (
            <circle
              key={point.entry.sha}
              className={
                breach ? "pt-point pt-breach" : i === last ? "pt-point pt-last" : "pt-point"
              }
              cx={round(x(i))}
              cy={round(y(point.value))}
              r={i === last ? 4.5 : 3}
            >
              <title>{`${point.entry.sha.slice(0, 7)}, ${point.entry.date.slice(0, 10)}: ${formatValue(metric, point.value)}`}</title>
            </circle>
          );
        })}
      </g>
    </>
  );
}

export function describe(metric: ChartMetric, points: Point[], budget?: number): string {
  const label = labelOf(metric);
  if (points.length === 0) return `${label}: no deploys measured yet.`;
  const first = points[0] as Point;
  const last = points[points.length - 1] as Point;
  const values = points.map((p) => p.value);
  const best = higherIsBetter(metric) ? Math.max(...values) : Math.min(...values);
  const parts = [
    points.length === 1
      ? `${label} ${formatValue(metric, last.value)} on the only measured deploy.`
      : `${label} went from ${formatValue(metric, first.value)} to ${formatValue(metric, last.value)} over ${points.length} deploys, best ${formatValue(metric, best)}.`,
  ];
  if (budget !== undefined) {
    const over = points.filter((p) => breaches(metric, p.value, budget)).length;
    parts.push(
      over === 0
        ? `All within the ${formatValue(metric, budget)} budget.`
        : `${over} of ${points.length} outside the ${formatValue(metric, budget)} budget.`,
    );
  }
  return parts.join(" ");
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function slug(value: string): string {
  return value.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "root";
}
