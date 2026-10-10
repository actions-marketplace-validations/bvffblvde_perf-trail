import { writeFileSync } from "node:fs";
import { historyJsonSchema } from "../src/json-schema.ts";

const target = new URL("../schema/history.v1.json", import.meta.url);
writeFileSync(target, `${JSON.stringify(historyJsonSchema(), null, 2)}\n`);
