const CENTERS = [
  { cx: 980, cy: 120, rings: 9, base: 34, gap: 30, seed: 1.3 },
  { cx: 180, cy: 560, rings: 7, base: 40, gap: 34, seed: 2.7 },
];

const RINGS = CENTERS.flatMap(({ cx, cy, rings, base, gap, seed }) =>
  Array.from({ length: rings }, (_, i) => ({
    key: `${cx}-${cy}-${base + i * gap}`,
    d: ring(cx, cy, base + i * gap, seed + i * 0.35),
  })),
);

function ring(cx: number, cy: number, radius: number, seed: number): string {
  const steps = 72;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wobble =
      1 +
      0.09 * Math.sin(3 * a + seed) +
      0.05 * Math.sin(5 * a + seed * 2) +
      0.03 * Math.cos(7 * a);
    const r = radius * wobble;
    points.push(`${(cx + r * Math.cos(a) * 1.35).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

export function Contours() {
  return (
    <svg
      className="contours"
      viewBox="0 0 1200 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {RINGS.map(({ key, d }) => (
        <path key={key} d={d} />
      ))}
    </svg>
  );
}
