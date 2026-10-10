import { fetchHistory } from "@perf-trail/client";
import type { History } from "@perf-trail/core";

export const REPO = "bvffblvde/perf-trail";
export const HISTORY_TAG = "perf-history";

export type LoadedHistory = { history: History; error?: string };

export async function loadHistory(): Promise<LoadedHistory> {
  try {
    const history = await fetchHistory({
      repo: REPO,
      init: { next: { revalidate: 3600, tags: [HISTORY_TAG] } },
    });
    return { history };
  } catch (error) {
    return {
      history: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
