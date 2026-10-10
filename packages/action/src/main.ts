import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import * as core from "@actions/core";
import { context } from "@actions/github";
import { badgesFor } from "@perf-trail/badge";
import { measureBundle } from "@perf-trail/bundle";
import {
  type Budgets,
  type Bundle,
  type Entry,
  entrySchema,
  evaluateBudgets,
  firstLine,
  type PageResult,
  parseBudgets,
} from "@perf-trail/core";
import { checkedOutSha, runBuild } from "./build.ts";
import { createGitHubApi } from "./github.ts";
import { type Inputs, pageKey, readInputs } from "./inputs.ts";
import { installLighthouse, measurePage } from "./lighthouse.ts";
import { revalidate } from "./revalidate.ts";
import { saveEntry } from "./store.ts";
import { summaryMarkdown } from "./summary.ts";
import { auditUrls, resolveTarget } from "./target.ts";

export async function run(): Promise<void> {
  try {
    const inputs = readInputs((name) => core.getInput(name));
    const target = resolveTarget(
      context.eventName,
      context.payload,
      context.sha,
      inputs.environmentPrefix,
    );
    if (target.kind === "skip") {
      core.info(`perf-trail: skipped, ${target.reason}`);
      core.setOutput("skipped", "true");
      return;
    }
    core.setOutput("skipped", "false");

    const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
    const cwd = resolve(workspace, inputs.workingDirectory);
    const budgets = inputs.budgetsPath
      ? await readBudgets(resolve(workspace, inputs.budgetsPath))
      : undefined;
    const bundle = await measureBuild(inputs, cwd, target.sha);

    const urls = auditUrls(inputs.urls, target.deploymentUrl, inputs.useDeploymentUrl);
    const api = createGitHubApi(inputs.token, context.repo);
    const commit = await api.getCommit(target.sha);

    const runLighthouse = await installLighthouse(
      resolve(process.env.RUNNER_TEMP || tmpdir(), "perf-trail-lighthouse"),
    );
    const pages: Record<string, PageResult> = {};
    for (const url of urls) {
      const { result, runs } = await core.group(`Lighthouse ${url.href}`, () =>
        measurePage(runLighthouse, url, inputs.preset, inputs.runs),
      );
      for (const [i, r] of runs.entries()) core.info(`run ${i + 1}: ${describe(r)}`);
      core.info(`median: ${describe(result)}`);
      pages[pageKey(url)] = result;
    }

    const message = inputs.storeCommitMessage ? firstLine(commit.message) : "";
    const measured = {
      v: 1,
      sha: target.sha,
      date: new Date(commit.date).toISOString(),
      ...(message ? { message } : {}),
      url: (urls[0] as URL).origin,
      preset: inputs.preset,
      pages,
      ...(bundle ? { bundle } : {}),
    };
    const entry: Entry = entrySchema.parse({
      ...measured,
      ...(budgets ? { budgets: evaluateBudgets(measured, budgets) } : {}),
    });

    const badgeDir = inputs.preset === "mobile" ? "badges" : `badges/${inputs.preset}`;
    const badges = Object.fromEntries(
      Object.entries(badgesFor(entry, budgets)).map(([path, svg]) => [`${badgeDir}/${path}`, svg]),
    );
    const { history, previous } = await saveEntry(api, {
      branch: inputs.dataBranch,
      entry,
      maxEntries: inputs.maxEntries,
      files: badges,
    });
    core.info(
      `perf-trail: saved ${entry.sha.slice(0, 7)} to ${inputs.dataBranch} (${history.length} entries)`,
    );

    const summary = summaryMarkdown(entry, previous);
    core.setOutput("entry-json", JSON.stringify(entry));
    core.setOutput("summary-markdown", summary);
    core.setOutput("budget-passed", String(entry.budgets?.passed ?? true));
    await core.summary.addRaw(summary).write();

    if (inputs.revalidateUrl) {
      const result = await revalidate(inputs.revalidateUrl, inputs.revalidateSecret);
      if (result.ok) core.info(result.message);
      else core.warning(result.message);
    }

    if (entry.budgets && !entry.budgets.passed) {
      const report = `Budgets failed:\n${entry.budgets.failures.map((f) => `  ${f}`).join("\n")}`;
      if (inputs.failOnBudget) core.setFailed(report);
      else core.warning(report);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

async function measureBuild(inputs: Inputs, cwd: string, sha: string): Promise<Bundle | undefined> {
  if (!inputs.bundle) return undefined;
  const head = await checkedOutSha(cwd);
  if (head === undefined) {
    throw new Error(
      `bundle needs the repository checked out in ${cwd}: add actions/checkout with ref set to the deployed sha`,
    );
  }
  if (head !== sha) {
    core.warning(
      `Checked out ${head.slice(0, 7)} but measuring ${sha.slice(0, 7)}: bundle sizes come from a different commit. Set ref on actions/checkout to the deployed sha.`,
    );
  }
  if (inputs.buildCommand) {
    await core.group(`Build: ${inputs.buildCommand}`, () =>
      runBuild(inputs.buildCommand as string, cwd),
    );
  }
  const bundle = measureBundle(inputs.bundle, cwd);
  for (const [route, bytes] of Object.entries(bundle.routes)) {
    core.info(`bundle ${route}: ${(bytes / 1024).toFixed(1)} KiB gzip`);
  }
  return bundle;
}

async function readBudgets(path: string): Promise<Budgets> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    throw new Error(`budgets file ${path} not found: check out the repository before perf-trail`);
  }
  try {
    return parseBudgets(JSON.parse(raw));
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function describe({ scores, metrics }: PageResult): string {
  return `performance ${scores.performance}, LCP ${metrics.lcp} ms, CLS ${metrics.cls}, TBT ${metrics.tbt} ms`;
}
