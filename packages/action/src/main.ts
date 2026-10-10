import { tmpdir } from "node:os";
import { join } from "node:path";
import * as core from "@actions/core";
import { context } from "@actions/github";
import { type Entry, entrySchema, firstLine, type PageResult } from "@perf-trail/core";
import { createGitHubApi } from "./github.ts";
import { pageKey, readInputs } from "./inputs.ts";
import { installLighthouse, measurePage } from "./lighthouse.ts";
import { revalidate } from "./revalidate.ts";
import { saveEntry } from "./store.ts";
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

    const urls = auditUrls(inputs.urls, target.deploymentUrl, inputs.useDeploymentUrl);
    const api = createGitHubApi(inputs.token, context.repo);
    const commit = await api.getCommit(target.sha);

    const runLighthouse = await installLighthouse(
      join(process.env.RUNNER_TEMP || tmpdir(), "perf-trail-lighthouse"),
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
    const entry: Entry = entrySchema.parse({
      v: 1,
      sha: target.sha,
      date: new Date(commit.date).toISOString(),
      ...(message ? { message } : {}),
      url: (urls[0] as URL).origin,
      preset: inputs.preset,
      pages,
    });

    const { history } = await saveEntry(api, {
      branch: inputs.dataBranch,
      entry,
      maxEntries: inputs.maxEntries,
    });
    core.info(
      `perf-trail: saved ${entry.sha.slice(0, 7)} to ${inputs.dataBranch} (${history.length} entries)`,
    );
    core.setOutput("entry-json", JSON.stringify(entry));

    if (inputs.revalidateUrl) {
      const result = await revalidate(inputs.revalidateUrl, inputs.revalidateSecret);
      if (result.ok) core.info(result.message);
      else core.warning(result.message);
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

function describe({ scores, metrics }: PageResult): string {
  return `performance ${scores.performance}, LCP ${metrics.lcp} ms, CLS ${metrics.cls}, TBT ${metrics.tbt} ms`;
}
