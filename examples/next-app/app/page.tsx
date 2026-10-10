import { jsBadge, lcpBadge, scoreBadge } from "@perf-trail/badge";
import { latest } from "@perf-trail/core";
import {
  formatValue,
  LatestDeployCard,
  PerfHistoryChart,
  PerfHistoryTable,
} from "@perf-trail/react";
import Image from "next/image";
import Link from "next/link";
import { Code } from "./_components/code";
import { loadHistory, REPO } from "./_lib/history";

export const revalidate = 3600;

const LCP_BUDGET = 2500;
const JS_BUDGET_KIB = 200;

const workflow = `name: Perf
on: [deployment_status, workflow_dispatch]
permissions:
  contents: write
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: bvffblvde/perf-trail@main
        with:
          urls: https://your-site.com/`;

const reactUsage = `import { fetchHistory } from "@perf-trail/client";
import { LatestDeployCard, PerfHistoryChart } from "@perf-trail/react";
import "@perf-trail/react/styles.css";

export default async function Perf() {
  const history = await fetchHistory({ repo: "you/your-site" });
  return (
    <>
      <LatestDeployCard history={history} repo="you/your-site" />
      <PerfHistoryChart history={history} metric="lcp" page="/" budget={2500} />
    </>
  );
}`;

const badgeUsage = `![Lighthouse](https://raw.githubusercontent.com/you/your-site/perf-data/badges/performance.svg)
![LCP](https://raw.githubusercontent.com/you/your-site/perf-data/badges/lcp.svg)
![JS](https://raw.githubusercontent.com/you/your-site/perf-data/badges/js.svg)`;

const steps = [
  {
    title: "Your host deploys",
    text: "Vercel, Netlify or any provider reports a successful production deployment to GitHub. Pushes and manual runs work too.",
  },
  {
    title: "The action builds and weighs JS",
    text: "Optional: it runs your build and sums the gzip JS each route loads, read from the Next.js or Vite manifests.",
  },
  {
    title: "Lighthouse runs three times",
    text: "Each URL is audited on the live site and the median run is kept, so one noisy run does not move your chart.",
  },
  {
    title: "Budgets are checked",
    text: "Scores, metrics and JS are compared with perf-trail.budgets.json. A miss fails the job after the result is saved.",
  },
  {
    title: "History is committed",
    text: "The entry is appended to history.json in a perf-data branch, with fresh badges, in one commit by github-actions.",
  },
  {
    title: "Your site renders it",
    text: "Read the branch at build or request time and render server-side SVG charts. No client JavaScript required.",
  },
];

const comparison = [
  {
    name: "perf-trail",
    lighthouse: true,
    bundle: true,
    history: "git branch in your repo",
    ui: "SVG charts, card, table, badges",
    infra: "none",
  },
  {
    name: "Lighthouse CI",
    lighthouse: true,
    bundle: false,
    history: "LHCI server you host (temporary storage keeps 7 days)",
    ui: "LHCI server dashboard",
    infra: "server and database",
  },
  {
    name: "lighthouse-ci-action",
    lighthouse: true,
    bundle: false,
    history: "artifacts or temporary storage",
    ui: "report links per run",
    infra: "none",
  },
  {
    name: "size-limit, compressed-size",
    lighthouse: false,
    bundle: true,
    history: "compared per pull request",
    ui: "PR comments",
    infra: "none",
  },
];

export default async function Home() {
  const { history, error } = await loadHistory();
  const current = latest(history);
  const home = current?.pages["/"];
  const largestJs = current?.bundle ? Math.max(...Object.values(current.bundle.routes)) : undefined;
  const sample = current ? compactJson(current) : undefined;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">See how every deploy changed your site's speed.</h1>
        <p className="lede">
          perf-trail is a GitHub Action. After each production deploy it runs Lighthouse and weighs
          your JavaScript, then commits the result to a branch in your own repo. Render that history
          on your site as server-side SVG charts and badges. No server, no database, no account.
        </p>
        <div className="actions">
          <a className="button primary" href="#setup">
            Set up perf-trail
          </a>
          <a className="button" href={`https://github.com/${REPO}`}>
            View on GitHub
          </a>
        </div>

        <div className="live">
          <div className="live-chart">
            <div className="live-head">
              <h2>This page, deploy by deploy</h2>
              <p>
                {history.length > 0
                  ? `${history.length} deploys measured on a mobile profile`
                  : "Waiting for the first measured deploy"}
              </p>
            </div>
            {error ? (
              <p className="notice">The history could not be loaded right now: {error}</p>
            ) : null}
            <PerfHistoryChart
              className="chart-wide"
              id="hero-lcp"
              history={history}
              metric="lcp"
              page="/"
              budget={LCP_BUDGET}
              title="Largest Contentful Paint of this page"
              width={720}
              height={320}
            />
            <PerfHistoryChart
              className="chart-compact"
              id="hero-lcp-compact"
              history={history}
              metric="lcp"
              page="/"
              budget={LCP_BUDGET}
              title="Largest Contentful Paint of this page"
              width={360}
              height={240}
            />
          </div>
          <div className="live-side">
            <LatestDeployCard history={history} page="/" repo={REPO} />
            {home ? (
              <div className="badges">
                <Badge
                  svg={scoreBadge(home.scores.performance)}
                  alt={`Lighthouse performance ${home.scores.performance}`}
                />
                <Badge
                  svg={lcpBadge(home.metrics.lcp)}
                  alt={`LCP ${formatValue("lcp", home.metrics.lcp)}`}
                />
                {largestJs !== undefined ? (
                  <Badge
                    svg={jsBadge(largestJs, JS_BUDGET_KIB)}
                    alt={`JS ${formatValue("js", largestJs)}`}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="how">
        <header>
          <h2 id="how">What happens on every deploy</h2>
          <p>
            One workflow job that takes a few minutes on a GitHub runner. Everything it writes stays
            in your repository.
          </p>
        </header>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="setup" aria-labelledby="setup-title">
        <header>
          <h2 id="setup-title">Set it up in three snippets</h2>
          <p>
            Add the workflow, deploy once, then show the data wherever you like. Bundle sizes,
            budgets and private repos are covered in the <Link href="/docs">docs</Link>.
          </p>
        </header>
        <ol className="setup" aria-label="Setup">
          <li className="snippet">
            <div>
              <h3>Measure every deploy</h3>
              <p>Save as .github/workflows/perf.yml. The first run creates the perf-data branch.</p>
            </div>
            <Code code={workflow} label="perf.yml" language="yaml" />
          </li>
          <li className="snippet">
            <div>
              <h3>Render the history</h3>
              <p>
                Server components, pure SVG, themed with CSS variables. Works in light and dark.
              </p>
            </div>
            <Code code={reactUsage} label="app/perf/page.tsx" language="tsx" />
          </li>
          <li className="snippet">
            <div>
              <h3>Show badges in your README</h3>
              <p>Regenerated in the data branch after each run.</p>
            </div>
            <Code code={badgeUsage} label="README.md" language="markdown" />
          </li>
        </ol>
      </section>

      <section className="section" aria-labelledby="stored">
        <header>
          <h2 id="stored">What gets stored</h2>
          <p>
            One JSON entry per deploy, validated against a published schema. This is the latest
            entry for this site, as it sits in the data branch.
          </p>
        </header>
        <div className="split">
          <ul>
            <li>
              <strong>Commit sha, date and the first line of the message.</strong> Turn messages off
              with store-commit-message: false.
            </li>
            <li>
              <strong>Four Lighthouse scores and five metrics per page,</strong> from the median of
              three runs.
            </li>
            <li>
              <strong>Gzip JS per route,</strong> when bundle is set to next, vite or a glob.
            </li>
            <li>
              <strong>Budget result</strong> with every miss spelled out.
            </li>
            <li>
              <strong>The last 300 deploys</strong> by default. Older entries drop off.
            </li>
          </ul>
          {sample ? (
            <Code code={sample} label="history.json, latest entry" language="json" />
          ) : (
            <p>The first measured deploy appears here.</p>
          )}
        </div>
      </section>

      {history.length > 0 ? (
        <section className="section history" aria-labelledby="log">
          <header>
            <h2 id="log">Deploy log of this site</h2>
            <p>The same data as the chart, newest first.</p>
          </header>
          <PerfHistoryTable history={history} page="/" repo={REPO} limit={12} />
        </section>
      ) : null}

      <section className="section" aria-labelledby="compare">
        <header>
          <h2 id="compare">How it compares</h2>
          <p>
            Good tools already cover parts of this. perf-trail puts lab metrics and bundle size in
            one history you own and can render on your own site.
          </p>
        </header>
        <div className="compare">
          <table>
            <thead>
              <tr>
                <th scope="col">Tool</th>
                <th scope="col">Lighthouse</th>
                <th scope="col">Bundle size</th>
                <th scope="col">History lives in</th>
                <th scope="col">What you see</th>
                <th scope="col">Infrastructure</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((tool) => (
                <tr key={tool.name} className={tool.name === "perf-trail" ? "us" : undefined}>
                  <th scope="row">{tool.name}</th>
                  <td className={tool.lighthouse ? "yes" : "no"}>
                    {tool.lighthouse ? "Yes" : "No"}
                  </td>
                  <td className={tool.bundle ? "yes" : "no"}>{tool.bundle ? "Yes" : "No"}</td>
                  <td>{tool.history}</td>
                  <td>{tool.ui}</td>
                  <td>{tool.infra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section" aria-labelledby="faq">
        <header>
          <h2 id="faq">Questions</h2>
        </header>
        <div className="faq">
          <details>
            <summary>Why do the numbers move when nothing changed?</summary>
            <div>
              <p>
                Lighthouse is lab data from a shared GitHub runner, and runners differ in CPU and
                network. perf-trail runs each page three times and keeps the median run, which
                removes most single-run spikes. Watch the trend across several deploys rather than
                one point, and set budgets with some headroom.
              </p>
            </div>
          </details>
          <details>
            <summary>Why is there no INP?</summary>
            <div>
              <p>
                Interaction to Next Paint needs real users interacting with the page. A lab run has
                no users, so perf-trail records Total Blocking Time, the closest lab signal. For
                INP, use field data from the Chrome UX Report or your own RUM.
              </p>
            </div>
          </details>
          <details>
            <summary>Does it work with private repositories?</summary>
            <div>
              <p>
                Yes. The action writes with the workflow token. To read the history from a private
                repo, pass a read-only token to fetchHistory and it uses the GitHub API instead of
                raw.githubusercontent.com.
              </p>
            </div>
          </details>
          <details>
            <summary>How do I reset the history?</summary>
            <div>
              <p>
                Delete the perf-data branch. The next run creates it again with a single entry. To
                keep the branch but drop old entries, lower max-entries.
              </p>
            </div>
          </details>
          <details>
            <summary>Will the data branch trigger deploys?</summary>
            <div>
              <p>
                The action adds a vercel.json with deployments disabled when it creates the branch,
                so Vercel skips it. On other hosts, exclude the branch in the deploy settings.
              </p>
            </div>
          </details>
        </div>
      </section>
    </>
  );
}

function compactJson(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(
    /\{\n\s+([^{}[\]]*?)\n\s*\}/g,
    (match, body: string) => {
      const line = `{ ${body.split(/,\n\s*/).join(", ")} }`;
      return line.length <= 64 ? line : match;
    },
  );
}

function Badge({ svg, alt }: { svg: string; alt: string }) {
  const width = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 100);
  return (
    <Image
      unoptimized
      src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
      alt={alt}
      width={width}
      height={20}
    />
  );
}
