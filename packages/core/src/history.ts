import { type Entry, entrySchema, type History } from "./schema.ts";

export const MAX_MESSAGE_LENGTH = 100;

export function firstLine(message: string, max = MAX_MESSAGE_LENGTH): string {
  const line = (message.split(/\r?\n/)[0] ?? "").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

export function appendEntry(history: History, entry: Entry, maxEntries: number): History {
  if (!Number.isInteger(maxEntries) || maxEntries < 1) {
    throw new Error(`maxEntries must be a positive integer, got ${maxEntries}`);
  }
  return [...history.filter((e) => !sameRun(e, entry)), entry]
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(-maxEntries);
}

export function parseHistory(input: unknown): History {
  if (!Array.isArray(input)) throw new Error("history must be a JSON array");
  return input.map((raw, index) => {
    const version = (raw as { v?: unknown } | null)?.v;
    if (version !== 1) {
      throw new Error(`history entry ${index}: unsupported version ${String(version)}`);
    }
    const result = entrySchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`history entry ${index}: ${result.error.issues.map(formatIssue).join("; ")}`);
    }
    return result.data;
  });
}

export function latest(history: History, preset?: Entry["preset"]): Entry | undefined {
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i] as Entry;
    if (!preset || entry.preset === preset) return entry;
  }
  return undefined;
}

function sameRun(a: Entry, b: Entry): boolean {
  return a.sha === b.sha && a.preset === b.preset;
}

function formatIssue(issue: { path: PropertyKey[]; message: string }): string {
  return `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`;
}
