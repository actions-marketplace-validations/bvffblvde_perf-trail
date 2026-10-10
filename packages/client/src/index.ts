import { type History, parseHistory } from "@perf-trail/core";

export type HistorySource = {
  repo: string;
  branch?: string;
  path?: string;
  token?: string;
};

export type FetchHistoryOptions = HistorySource & {
  fetch?: typeof fetch;
  init?: RequestInit;
  timeoutMs?: number;
};

export class HistoryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HistoryError";
  }
}

export function historyUrl({
  repo,
  branch = "perf-data",
  path = "history.json",
  token,
}: HistorySource): string {
  assertRepo(repo);
  const file = path.split("/").map(encodeURIComponent).join("/");
  return token
    ? `https://api.github.com/repos/${repo}/contents/${file}?ref=${encodeURIComponent(branch)}`
    : `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${file}`;
}

export async function fetchHistory(options: FetchHistoryOptions): Promise<History> {
  const { fetch: fetchImpl = fetch, init, timeoutMs = 10_000, token } = options;
  const url = historyUrl(options);
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/vnd.github.raw+json");
    headers.set("X-GitHub-Api-Version", "2022-11-28");
  }
  const response = await fetchImpl(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
  });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new HistoryError(
      `perf-trail history: ${url} responded ${response.status}`,
      response.status,
    );
  }
  return parseHistory(await response.json());
}

function assertRepo(repo: string): void {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new HistoryError(`perf-trail history: repo must look like "owner/name", got "${repo}"`);
  }
}
