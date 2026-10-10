import { z } from "zod";
import { budgetsSchema } from "./budgets.ts";
import { historySchema } from "./schema.ts";

const BASE = "https://raw.githubusercontent.com/bvffblvde/perf-trail/main/packages/core/schema";

export const SCHEMA_ID = `${BASE}/history.v1.json`;
export const BUDGETS_SCHEMA_ID = `${BASE}/budgets.v1.json`;

export function historyJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(historySchema, { target: "draft-2020-12" }),
    $id: SCHEMA_ID,
    title: "perf-trail history v1",
  };
}

export function budgetsJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(budgetsSchema, { target: "draft-2020-12", io: "input" }),
    $id: BUDGETS_SCHEMA_ID,
    title: "perf-trail budgets v1",
  };
}
