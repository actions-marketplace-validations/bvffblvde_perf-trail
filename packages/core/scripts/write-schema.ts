import { writeFileSync } from "node:fs";
import { budgetsJsonSchema, historyJsonSchema } from "../src/json-schema.ts";

const write = (name: string, schema: Record<string, unknown>) =>
  writeFileSync(
    new URL(`../schema/${name}`, import.meta.url),
    `${JSON.stringify(schema, null, 2)}\n`,
  );

write("history.v1.json", historyJsonSchema());
write("budgets.v1.json", budgetsJsonSchema());
