import { type Budgets, type Entry, formatBytes, formatSeconds } from "@perf-trail/core";
import { colors, renderBadge } from "./badge.ts";

export { type BadgeOptions, colors, renderBadge } from "./badge.ts";
export { textWidth } from "./width.ts";

export function scoreBadge(score: number, label = "Lighthouse"): string {
  const color = score >= 90 ? colors.good : score >= 50 ? colors.average : colors.poor;
  return renderBadge({ label, message: String(score), color });
}

export function lcpBadge(ms: number, label = "LCP"): string {
  const color = ms <= 2500 ? colors.good : ms <= 4000 ? colors.average : colors.poor;
  return renderBadge({ label, message: formatSeconds(ms), color });
}

export function jsBadge(bytes: number, maxKiB?: number, label = "JS"): string {
  const color =
    maxKiB === undefined ? colors.neutral : bytes <= maxKiB * 1024 ? colors.good : colors.poor;
  return renderBadge({ label, message: formatBytes(bytes), color });
}

export function pageSlug(page: string): string {
  const slug = page
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "index";
}

export function badgesFor(entry: Entry, budgets?: Budgets): Record<string, string> {
  const files: Record<string, string> = {};
  const pages = Object.entries(entry.pages);
  for (const [index, [page, result]] of pages.entries()) {
    const dir = `pages/${pageSlug(page)}`;
    const performance = scoreBadge(result.scores.performance);
    const lcp = lcpBadge(result.metrics.lcp);
    files[`${dir}/performance.svg`] = performance;
    files[`${dir}/lcp.svg`] = lcp;
    if (index === 0) {
      files["performance.svg"] = performance;
      files["lcp.svg"] = lcp;
    }
  }
  const routes = Object.entries(entry.bundle?.routes ?? {});
  if (routes.length > 0) {
    const [route, bytes] = routes.reduce((max, current) => (current[1] > max[1] ? current : max));
    files["js.svg"] = jsBadge(bytes, budgets?.bundle?.routes?.[route] ?? budgets?.bundle?.maxKiB);
  }
  return files;
}
