import { z } from "zod";

const score = z.number().int().min(0).max(100);
const nonNegative = z.number().min(0);
const bytes = z.number().int().min(0);

export const scoresSchema = z.object({
  performance: score,
  accessibility: score,
  bestPractices: score,
  seo: score,
});

export const metricsSchema = z.object({
  lcp: nonNegative,
  cls: nonNegative,
  tbt: nonNegative,
  fcp: nonNegative,
  si: nonNegative,
});

export const pageResultSchema = z.object({
  scores: scoresSchema,
  metrics: metricsSchema,
});

export const bundleSchema = z.object({
  routes: z.record(z.string(), bytes),
  chunks: z.record(z.string(), bytes).optional(),
});

export const budgetResultSchema = z.object({
  passed: z.boolean(),
  failures: z.array(z.string()),
});

export const presetSchema = z.enum(["mobile", "desktop"]);

export const entrySchema = z.object({
  v: z.literal(1),
  sha: z.string().regex(/^[0-9a-f]{7,64}$/),
  date: z.iso.datetime({ offset: true }),
  message: z.string().max(100).optional(),
  url: z.url(),
  preset: presetSchema,
  pages: z.record(z.string(), pageResultSchema),
  bundle: bundleSchema.optional(),
  budgets: budgetResultSchema.optional(),
});

export const historySchema = z.array(entrySchema);

export type Scores = z.infer<typeof scoresSchema>;
export type Metrics = z.infer<typeof metricsSchema>;
export type PageResult = z.infer<typeof pageResultSchema>;
export type Bundle = z.infer<typeof bundleSchema>;
export type BudgetResult = z.infer<typeof budgetResultSchema>;
export type Preset = z.infer<typeof presetSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type History = Entry[];

export const metricKeys = ["lcp", "cls", "tbt", "fcp", "si"] as const satisfies (keyof Metrics)[];
export const scoreKeys = [
  "performance",
  "accessibility",
  "bestPractices",
  "seo",
] as const satisfies (keyof Scores)[];
