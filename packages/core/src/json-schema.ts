import { z } from "zod";
import { historySchema } from "./schema.ts";

export const SCHEMA_ID =
  "https://raw.githubusercontent.com/bvffblvde/perf-trail/main/packages/core/schema/history.v1.json";

export function historyJsonSchema(): Record<string, unknown> {
  return {
    ...z.toJSONSchema(historySchema, { target: "draft-2020-12" }),
    $id: SCHEMA_ID,
    title: "perf-trail history v1",
  };
}
