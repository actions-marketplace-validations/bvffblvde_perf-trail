import type { GitHubApi } from "../src/github.ts";

export type FakeBranch = { head: string; files: Record<string, string> };

export function fakeGitHub(initial: Record<string, FakeBranch> = {}) {
  const branches = new Map(Object.entries(initial));
  const commits: {
    branch: string;
    parent: string | null;
    files: Record<string, string>;
    message: string;
  }[] = [];
  let conflicts = 0;
  const api: GitHubApi = {
    async getCommit(sha) {
      return {
        message: `feat: change ${sha.slice(0, 7)}\n\nbody`,
        date: "2026-10-01T10:00:00+02:00",
      };
    },
    async getBranchHead(branch) {
      return branches.get(branch)?.head ?? null;
    },
    async readFile(ref, path) {
      const branch = [...branches.values()].find((b) => b.head === ref);
      return branch?.files[path] ?? null;
    },
    async commitFiles(options) {
      commits.push(options);
      if (conflicts > 0) {
        conflicts--;
        return "conflict";
      }
      const current = branches.get(options.branch);
      branches.set(options.branch, {
        head: `commit${commits.length}`,
        files: { ...current?.files, ...options.files },
      });
      return "ok";
    },
  };
  return {
    api,
    branches,
    commits,
    failNextCommits(count: number) {
      conflicts = count;
    },
  };
}
