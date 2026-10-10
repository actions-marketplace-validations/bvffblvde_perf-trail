import type { History, Preset } from "@perf-trail/core";
import { formatDate, type LabelsInput, type PerfLabels, resolveLabels } from "./labels.ts";
import {
  breaches,
  type ChartMetric,
  domainFor,
  formatValue,
  higherIsBetter,
  niceTicks,
  type Point,
  seriesFor,
} from "./series.ts";
import { ChartTooltip, type TooltipPoint } from "./tooltip.tsx";

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
  interactive?: boolean;
  labels?: LabelsInput;
  className?: string;
  id?: string;
};

const MARGIN = { top: 16, right: 16, bottom: 30, left: 52 };
const MAX_MARKERS = 60;

type Geometry = {
  x: (i: number) => number;
  y: (value: number) => number;
  low: number;
  high: number;
};

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
  interactive = false,
  labels: labelsInput,
  className,
  id: idProp,
}: PerfHistoryChartProps) {
  const labels = resolveLabels(labelsInput);
  const points = seriesFor(history, {
    metric,
    ...(page ? { page } : {}),
    ...(route ? { route } : {}),
    preset,
  });
  const subject = page ?? route;
  const heading = title ?? labels.chartTitle(labels.metrics[metric], subject);
  const id = idProp ?? `pt-${metric}-${slug(subject ?? "all")}-${preset}`;
  const summary = describe(metric, points, budget, labels);
  const classes = ["pt-chart", className].filter(Boolean).join(" ");
  const geometry =
    points.length > 0 ? geometryFor(points, metric, budget, width, height) : undefined;

  const svg = (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{heading}</title>
      <desc id={`${id}-desc`}>{summary}</desc>
      {geometry ? (
        <Plot
          points={points}
          metric={metric}
          budget={budget}
          width={width}
          height={height}
          geometry={geometry}
          labels={labels}
          markers={!interactive}
        />
      ) : (
        <text className="pt-empty" x={width / 2} y={height / 2} textAnchor="middle">
          {labels.empty}
        </text>
      )}
    </svg>
  );

  return (
    <figure className={classes} data-metric={metric}>
      {interactive && geometry ? (
        <div className="pt-plot">
          {svg}
          <ChartTooltip
            label={heading}
            hint={labels.tooltipHint}
            points={tooltipPoints(points, metric, budget, geometry, width, height, labels)}
          />
        </div>
      ) : (
        svg
      )}
      {showCaption ? <figcaption>{summary}</figcaption> : null}
    </figure>
  );
}

function geometryFor(
  points: Point[],
  metric: ChartMetric,
  budget: number | undefined,
  width: number,
  height: number,
): Geometry {
  const [low, high] = domainFor(
    metric,
    points.map((p) => p.value),
    budget,
  );
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  return {
    low,
    high,
    x: (i) =>
      round(
        MARGIN.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth),
      ),
    y: (value) => round(MARGIN.top + (1 - (value - low) / (high - low || 1)) * plotHeight),
  };
}

function tooltipPoints(
  points: Point[],
  metric: ChartMetric,
  budget: number | undefined,
  { x, y }: Geometry,
  width: number,
  height: number,
  labels: PerfLabels,
): TooltipPoint[] {
  return points.map((point, i) => {
    const sha = point.entry.sha.slice(0, 7);
    const date = formatDate(point.entry.date, labels.locale);
    const value = formatValue(metric, point.value);
    return {
      x: (x(i) / width) * 100,
      y: (y(point.value) / height) * 100,
      label: labels.point({ sha, date, value }),
      lines: [`${date}, ${sha}`, ...(point.entry.message ? [point.entry.message] : []), value],
      ...(breaches(metric, point.value, budget) ? { breach: true } : {}),
    };
  });
}

function Plot({
  points,
  metric,
  budget,
  width,
  height,
  geometry: { x, y, low, high },
  labels,
  markers,
}: {
  points: Point[];
  metric: ChartMetric;
  budget: number | undefined;
  width: number;
  height: number;
  geometry: Geometry;
  labels: PerfLabels;
  markers: boolean;
}) {
  const ticks = niceTicks(low, high, 4).filter((t) => t >= low && t <= high);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.value)}`).join("");
  const baseline = y(low);
  const area = `${line}L${x(points.length - 1)} ${baseline}L${x(0)} ${baseline}Z`;
  const showAll = points.length <= MAX_MARKERS;
  const last = points.length - 1;
  const xLabels = points.length === 1 ? [0] : [0, last];

  return (
    <>
      <g className="pt-grid">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
              {formatValue(metric, tick)}
            </text>
          </g>
        ))}
      </g>
      <g className="pt-axis">
        {xLabels.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 8}
            textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : "end"}
          >
            {(points[i] as Point).entry.sha.slice(0, 7)}
          </text>
        ))}
      </g>
      {budget !== undefined && budget >= low && budget <= high ? (
        <g className="pt-budget">
          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(budget)} y2={y(budget)} />
          <text x={width - MARGIN.right} y={y(budget) - 6} textAnchor="end">
            {labels.budgetLine(formatValue(metric, budget))}
          </text>
        </g>
      ) : null}
      {points.length > 1 ? <path className="pt-area" d={area} /> : null}
      <path className="pt-line" d={line} />
      <g className="pt-points">
        {points.map((point, i) => {
          const breach = breaches(metric, point.value, budget);
          if (!breach && i !== last && (!markers || !showAll)) return null;
          return (
            <circle
              key={point.entry.sha}
              className={
                breach ? "pt-point pt-breach" : i === last ? "pt-point pt-last" : "pt-point"
              }
              cx={x(i)}
              cy={y(point.value)}
              r={i === last ? 4.5 : 3}
            >
              {markers ? (
                <title>
                  {labels.point({
                    sha: point.entry.sha.slice(0, 7),
                    date: formatDate(point.entry.date, labels.locale),
                    value: formatValue(metric, point.value),
                  })}
                </title>
              ) : null}
            </circle>
          );
        })}
      </g>
    </>
  );
}

export function describe(
  metric: ChartMetric,
  points: Point[],
  budget?: number,
  labels: PerfLabels = resolveLabels(undefined),
): string {
  const label = labels.metrics[metric];
  if (points.length === 0) return `${label}: ${labels.empty}.`;
  const values = points.map((p) => p.value);
  const best = higherIsBetter(metric) ? Math.max(...values) : Math.min(...values);
  return labels.summary({
    metric,
    label,
    count: points.length,
    first: formatValue(metric, (points[0] as Point).value),
    last: formatValue(metric, (points[points.length - 1] as Point).value),
    best: formatValue(metric, best),
    ...(budget === undefined ? {} : { budget: formatValue(metric, budget) }),
    over: points.filter((p) => breaches(metric, p.value, budget)).length,
  });
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function slug(value: string): string {
  return value.replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "root";
}
