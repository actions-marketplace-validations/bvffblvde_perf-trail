"use client";

import { type KeyboardEvent, useId, useRef, useState } from "react";

export type TooltipPoint = {
  x: number;
  y: number;
  label: string;
  lines: string[];
  breach?: boolean;
};

export type ChartTooltipProps = {
  label: string;
  hint: string;
  points: TooltipPoint[];
};

export function ChartTooltip({ label, hint, points }: ChartTooltipProps) {
  const [focusIndex, setFocusIndex] = useState(points.length - 1);
  const [active, setActive] = useState<number | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const hintId = useId();

  const move = (index: number) => {
    const next = Math.max(0, Math.min(points.length - 1, index));
    setFocusIndex(next);
    setActive(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const targets: Record<string, number> = {
      ArrowRight: focusIndex + 1,
      ArrowUp: focusIndex + 1,
      ArrowLeft: focusIndex - 1,
      ArrowDown: focusIndex - 1,
      Home: 0,
      End: points.length - 1,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    move(target);
  };

  const point = active === null ? undefined : points[active];

  return (
    <div
      className="pt-tip-layer"
      role="toolbar"
      aria-label={label}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
    >
      <span id={hintId} hidden>
        {hint}
      </span>
      {points.map((p, i) => (
        <button
          key={p.label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          className={i === active ? "pt-tip-point pt-active" : "pt-tip-point"}
          tabIndex={i === focusIndex ? 0 : -1}
          aria-label={p.label}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          onFocus={() => {
            setFocusIndex(i);
            setActive(i);
          }}
          onBlur={() => setActive(null)}
          onPointerEnter={() => setActive(i)}
          onPointerLeave={() => setActive(null)}
        />
      ))}
      {point ? (
        <div
          className="pt-tip"
          aria-hidden="true"
          style={{ left: `${Math.min(Math.max(point.x, 15), 85)}%`, top: `${point.y}%` }}
        >
          {point.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
