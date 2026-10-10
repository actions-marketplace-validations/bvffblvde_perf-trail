import { appendEntry, type Entry, type History, latest, parseHistory } from "@perf-trail/core";
import type { GitHubApi } from "./github.ts";

export const HISTORY_FILE = "history.json";

const DATA_BRANCH_FILES = {
  "vercel.json": `${JSON.stringify({ git: { deploymentEnabled: false } }, null, 2)}\n`,
};

export type SaveResult = { history: History; previous: Entry | undefined };

export async function saveEntry(
  api: GitHubApi,
  options: {
    branch: string;
    entry: Entry;
    maxEntries: number;
    files?: Record<string, string>;
    attempts?: number;
  },
): Promise<SaveResult> {
  const { branch, entry, maxEntries, files: extraFiles = {}, attempts = 3 } = options;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const head = await api.getBranchHead(branch);
    const current = head ? await readHistory(api, head, branch) : [];
    const previous = latest(
      current.filter((e) => e.sha !== entry.sha),
      entry.preset,
    );
    const history = appendEntry(current, entry, maxEntries);
    const files: Record<string, string> = {
      ...(head ? {} : DATA_BRANCH_FILES),
      ...extraFiles,
      [HISTORY_FILE]: `${JSON.stringify(history)}\n`,
    };
    const result = await api.commitFiles({
      branch,
      parent: head,
      files,
      message: `perf-trail: record ${entry.sha.slice(0, 7)} (${entry.preset})`,
    });
    if (result === "ok") return { history, previous };
  }
  throw new Error(`Branch ${branch} kept changing during ${attempts} attempts to save history`);
}

async function readHistory(api: GitHubApi, ref: string, branch: string): Promise<History> {
  const raw = await api.readFile(ref, HISTORY_FILE);
  if (raw === null) return [];
  try {
    return parseHistory(JSON.parse(raw));
  } catch (error) {
    throw new Error(
      `${branch}/${HISTORY_FILE} is not a perf-trail v1 history, refusing to overwrite it: ${message(error)}`,
    );
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function readLatest(
  api: GitHubApi,
  branch: string,
  preset: Entry["preset"],
): Promise<Entry | undefined> {
  const head = await api.getBranchHead(branch);
  if (!head) return undefined;
  return latest(await readHistory(api, head, branch), preset);
}
