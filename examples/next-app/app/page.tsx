import { jsBadge, lcpBadge, scoreBadge } from "@perf-trail/badge";
import { formatValue, PerfHistoryTable } from "@perf-trail/react";
import Image from "next/image";
import Link from "next/link";
import { MARKETPLACE } from "./_components/chrome";
import { Code } from "./_components/code";
import { Contours } from "./_components/contours";
import { CopyButton } from "./_components/copy-button";
import { PrComment } from "./_components/pr-comment";
import { LatestStats } from "./_components/stats";
import { DeployTrail } from "./_components/trail";
import { loadHistory, REPO } from "./_lib/history";

export const revalidate = 3600;

const LCP_BUDGET = 2500;
const JS_BUDGET_KIB = 200;
const USES = "uses: bvffblvde/perf-trail@v1";

const workflow = `name: Perf
on: [deployment_status, workflow_dispatch]
permissions:
  contents: write
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: bvffblvde/perf-trail@v1
        with:
          urls: https://your-site.com/`;

const install = "npm install @perf-trail/client @perf-trail/react";

const reactUsage = `import { fetchHistory } from "@perf-trail/client";
import { LatestDeployCard, PerfHistoryChart } from "@perf-trail/react";
import "@perf-trail/react/styles.css";

export default async function Perf() {
  const history = await fetchHistory({ repo: "you/your-site" });
  return (
    <>
      <LatestDeployCard history={history} />
      <PerfHistoryChart history={history} metric="lcp" budget={2500} />
    </>
  );
}`;

const badgeUsage = `![Lighthouse](https://raw.githubusercontent.com/you/your-site/perf-data/badges/performance.svg)
![LCP](https://raw.githubusercontent.com/you/your-site/perf-data/badges/lcp.svg)
![JS](https://raw.githubusercontent.com/you/your-site/perf-data/badges/js.svg)`;

const stations = [
  {
    title: "Deploy",
    text: "Vercel, Netlify or any host reports a production deployment. Pushes and manual runs work too.",
  },
  {
    title: "Build",
    text: "Optional: the action builds and sums the gzip JS each route loads from the Next.js or Vite manifests.",
  },
  {
    title: "Audit",
    text: "Lighthouse runs three times per URL on the live site and keeps the median run.",
  },
  {
    title: "Check",
    text: "Scores, metrics and JS meet perf-trail.budgets.json. A miss fails the job after saving.",
  },
  {
    title: "Commit",
    text: "The entry and fresh badges land in a perf-data branch of your repo in one commit.",
  },
  {
    title: "Render",
    text: "Your site reads the branch and draws server-side SVG. No client JavaScript needed.",
  },
];

const comparison = [
  {
    name: "perf-trail",
    lighthouse: true,
    bundle: true,
    history: "git branch in your repo",
    ui: "SVG charts, card, table, badges, PR comments",
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

const faq = [
  {
    q: "Why do the numbers move when nothing changed?",
    a: "Lighthouse is lab data from a shared GitHub runner, and runners differ in CPU and network. perf-trail runs each page three times and keeps the median run, which removes most single-run spikes. Watch the trend across several deploys, and set budgets with some headroom.",
  },
  {
    q: "Why is there no INP?",
    a: "Interaction to Next Paint needs real users interacting with the page. A lab run has none, so perf-trail records Total Blocking Time, the closest lab signal. For INP, use field data from the Chrome UX Report or your own RUM.",
  },
  {
    q: "Does it work with private repositories?",
    a: "Yes. The action writes with the workflow token. To read the history from a private repo, pass a read-only token to fetchHistory and it uses the GitHub API instead of raw.githubusercontent.com.",
  },
  {
    q: "How do I reset the history?",
    a: "Delete the perf-data branch. The next run creates it again with a single entry. To keep the branch but drop old entries, lower max-entries.",
  },
  {
    q: "pnpm refuses a fresh perf-trail release. Why?",
    a: "pnpm 11 and later skip packages published less than a day ago. Add @perf-trail/* to minimumReleaseAgeExclude in pnpm-workspace.yaml, or wait a day.",
  },
];

export default async function Home() {
  const { history, error } = await loadHistory();
  const entries = history.filter((e) => e.preset === "mobile");
  const current = entries[entries.length - 1];
  const previous = entries[entries.length - 2];
  const home = current?.pages["/"];
  const largestJs = current?.bundle ? Math.max(...Object.values(current.bundle.routes)) : undefined;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <Contours />
        <div className="hero-copy">
          <h1 id="hero-title">Every deploy leaves a trail. Keep it.</h1>
          <p className="lede">
            perf-trail is a GitHub Action that runs Lighthouse and weighs your JavaScript after each
            production deploy, then commits the result to a branch in your own repo. Render that
            history on your site as server-side SVG, or read it in pull request comments.
          </p>
          <div className="actions">
            <div className="uses">
              <code>{USES}</code>
              <CopyButton text={USES} label="action reference" />
            </div>
            <a className="button primary" href="#setup">
              Set up in three steps
            </a>
            <a className="button" href={MARKETPLACE}>
              GitHub Marketplace
            </a>
          </div>
          <ul className="facts">
            <li>No server, database or account</li>
            <li>History in a git branch you own</li>
            <li>MIT licensed</li>
          </ul>
        </div>
      </section>

      <section className="map" aria-labelledby="map-title">
        <header className="map-head">
          <div>
            <h2 id="map-title">This site, deploy by deploy</h2>
            <p>
              {entries.length > 0
                ? `${entries.length} production deploys measured on a mobile profile. Hover a stop for its commit.`
                : "Waiting for the first measured deploy."}
            </p>
          </div>
          {current ? (
            <LatestStats current={current} page="/" {...(previous ? { previous } : {})} />
          ) : null}
        </header>
        {error ? (
          <p className="notice">The history could not be loaded right now: {error}</p>
        ) : null}
        <p className="trail-hint">Showing the latest deploys. Scroll left for older ones.</p>
        <DeployTrail history={history} page="/" budget={LCP_BUDGET} jsBudgetKiB={JS_BUDGET_KIB} />
        <footer className="map-foot">
          <ul className="legend" aria-label="Legend">
            <li className="legend-line">LCP of the home page</li>
            <li className="legend-budget">LCP budget</li>
            <li className="legend-score">Lighthouse Performance</li>
            <li className="legend-bar">Largest route JS, gzip</li>
          </ul>
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
              {largestJs === undefined ? null : (
                <Badge
                  svg={jsBadge(largestJs, JS_BUDGET_KIB)}
                  alt={`JS ${formatValue("js", largestJs)}`}
                />
              )}
            </div>
          ) : null}
        </footer>
      </section>

      <section className="section" aria-labelledby="how">
        <header>
          <h2 id="how">What happens on every deploy</h2>
          <p>
            One workflow job, a few minutes on a GitHub runner. Everything it writes stays in your
            repository.
          </p>
        </header>
        <ol className="route">
          {stations.map((station) => (
            <li key={station.title}>
              <h3>{station.title}</h3>
              <p>{station.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section" id="setup" aria-labelledby="setup-title">
        <header>
          <h2 id="setup-title">Set it up in three steps</h2>
          <p>
            Bundle sizes, budgets, previews and private repos are covered in the{" "}
            <Link href="/docs">docs</Link>.
          </p>
        </header>
        <ol className="setup">
          <li>
            <div className="setup-text">
              <h3>Measure every deploy</h3>
              <p className="setup-note">
                Save as .github/workflows/perf.yml. The first run creates the perf-data branch.
              </p>
            </div>
            <div className="setup-code">
              <Code code={workflow} label=".github/workflows/perf.yml" language="yaml" />
            </div>
          </li>
          <li>
            <div className="setup-text">
              <h3>Render the history</h3>
              <p className="setup-note">
                Server components, pure SVG, themed with CSS variables, translated with labels.
              </p>
            </div>
            <div className="setup-code">
              <Code code={install} label="terminal" language="sh" />
              <Code code={reactUsage} label="app/perf/page.tsx" language="tsx" />
            </div>
          </li>
          <li>
            <div className="setup-text">
              <h3>Show badges in your README</h3>
              <p className="setup-note">Regenerated in the data branch after each run.</p>
            </div>
            <div className="setup-code">
              <Code code={badgeUsage} label="README.md" language="markdown" />
            </div>
          </li>
        </ol>
      </section>

      {current && previous ? (
        <section className="section split" aria-labelledby="pr-title">
          <header>
            <h2 id="pr-title">Catch regressions before they ship</h2>
            <p>
              Turn on preview-comment and every preview deployment gets measured too. The action
              keeps one comment on the pull request up to date, compared with the latest production
              entry. Previews never touch the history.
            </p>
            <p className="aside">
              The comment on the right is rendered from this site's last two deploys.
            </p>
          </header>
          <PrComment preview={current} production={previous} />
        </section>
      ) : null}

      <section className="section split code-wide" aria-labelledby="stored">
        <header>
          <h2 id="stored">What gets stored</h2>
          <p>
            One JSON entry per deploy, validated against a published schema. This is the latest
            entry for this site, exactly as it sits in the data branch.
          </p>
          <ul className="checks">
            <li>Commit sha, date and the first line of the message</li>
            <li>Four Lighthouse scores and five metrics per page</li>
            <li>Gzip JS per route with next, vite or a glob</li>
            <li>Budget result with every miss spelled out</li>
            <li>The last 300 deploys, older ones drop off</li>
          </ul>
        </header>
        {current ? (
          <Code code={compactJson(current)} label="history.json, latest entry" language="json" />
        ) : (
          <p>The first measured deploy appears here.</p>
        )}
      </section>

      {entries.length > 0 ? (
        <section className="section" aria-labelledby="log">
          <header>
            <h2 id="log">Deploy log</h2>
            <p>The same data as the trail, newest first.</p>
          </header>
          <PerfHistoryTable history={history} page="/" repo={REPO} limit={10} className="log" />
        </section>
      ) : null}

      <section className="section" aria-labelledby="compare">
        <header>
          <h2 id="compare">How it compares</h2>
          <p>
            Good tools cover parts of this. perf-trail keeps lab metrics and bundle size in one
            history you own.
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
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
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
      return line.length <= 66 ? line : match;
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
