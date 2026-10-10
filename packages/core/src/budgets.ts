import { z } from "zod";
import { formatBytes, formatMetric } from "./format.ts";
import {
  type BudgetResult,
  type Entry,
  type Metrics,
  metricKeys,
  type PageResult,
  type Scores,
  scoreKeys,
} from "./schema.ts";

const score = z.number().int().min(0).max(100);
const limit = z.number().min(0);

const pageBudgetSchema = z
  .object({
    scores: z
      .object({ performance: score, accessibility: score, bestPractices: score, seo: score })
      .partial()
      .strict()
      .optional()
      .describe("Minimum Lighthouse scores, 0 to 100"),
    metrics: z
      .object({ lcp: limit, cls: limit, tbt: limit, fcp: limit, si: limit })
      .partial()
      .strict()
      .optional()
      .describe("Maximum metric values: milliseconds, CLS is unitless"),
  })
  .strict();

export const budgetsSchema = pageBudgetSchema
  .extend({
    $schema: z.string().optional(),
    pages: z
      .record(z.string(), pageBudgetSchema)
      .optional()
      .describe("Overrides for single pages, keyed by path such as /en"),
    bundle: z
      .object({
        maxKiB: limit.optional().describe("Maximum gzip JS per route in KiB"),
        routes: z
          .record(z.string(), limit)
          .optional()
          .describe("Overrides in KiB keyed by route such as /[locale]"),
      })
      .strict()
      .optional(),
  })
  .strict();

export type Budgets = z.infer<typeof budgetsSchema>;
type PageBudget = z.infer<typeof pageBudgetSchema>;

export function parseBudgets(input: unknown): Budgets {
  const result = budgetsSchema.safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues.map(
    (issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`,
  );
  throw new Error(`invalid budgets: ${issues.join("; ")}`);
}

export function evaluateBudgets(
  entry: Pick<Entry, "pages" | "bundle">,
  budgets: Budgets,
): BudgetResult {
  const failures: string[] = [];
  for (const [page, result] of Object.entries(entry.pages)) {
    failures.push(...checkPage(page, result, merge(budgets, budgets.pages?.[page])));
  }
  if (entry.bundle && budgets.bundle) {
    for (const [route, bytes] of Object.entries(entry.bundle.routes)) {
      const maxKiB = budgets.bundle.routes?.[route] ?? budgets.bundle.maxKiB;
      if (maxKiB !== undefined && bytes > maxKiB * 1024) {
        failures.push(`bundle ${route} ${formatBytes(bytes)} > ${maxKiB} KiB`);
      }
    }
  }
  return { passed: failures.length === 0, failures };
}

function merge(base: PageBudget, override: PageBudget | undefined): PageBudget {
  return {
    scores: { ...base.scores, ...override?.scores },
    metrics: { ...base.metrics, ...override?.metrics },
  };
}

function checkPage(page: string, result: PageResult, budget: PageBudget): string[] {
  const failures: string[] = [];
  for (const key of scoreKeys) {
    const min = budget.scores?.[key as keyof Scores];
    if (min !== undefined && result.scores[key] < min) {
      failures.push(`${page} ${key} ${result.scores[key]} < ${min}`);
    }
  }
  for (const key of metricKeys) {
    const max = budget.metrics?.[key as keyof Metrics];
    if (max !== undefined && result.metrics[key] > max) {
      failures.push(
        `${page} ${key} ${formatMetric(key, result.metrics[key])} > ${formatMetric(key, max)}`,
      );
    }
  }
  return failures;
}
