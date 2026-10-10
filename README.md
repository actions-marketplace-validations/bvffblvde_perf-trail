# perf-trail

Performance history for every deploy. A GitHub Action audits your production site with Lighthouse after each deploy and appends the result to a JSON file in a git branch. No server, no database, no paid service.

Status: early development (phase 3 of 4). The action, the history format, the client and the React components work; npm packages and the Marketplace listing are next. Live demo and docs: https://perf-trail.vercel.app

## Usage

```yaml
name: Perf
on: [deployment_status, workflow_dispatch]
permissions:
  contents: write
concurrency: perf-trail
jobs:
  perf:
    runs-on: ubuntu-latest
    steps:
      - uses: bvffblvde/perf-trail@main
        with:
          urls: |
            https://example.com/
            https://example.com/about
```

On `deployment_status` only successful deployments whose environment starts with `Production` are measured; every other status is skipped with a log line. `push` and `workflow_dispatch` always measure the current commit.

## Bundle size and budgets

To record gzip JS per route, check out the deployed commit, install dependencies and let the action build:

```yaml
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.deployment.sha || github.sha }}
      - uses: actions/setup-node@v5
        with:
          node-version: 24
      - run: npm ci
      - uses: bvffblvde/perf-trail@main
        with:
          urls: https://example.com/
          build-command: npm run build
          bundle: next
          budgets: perf-trail.budgets.json
```

`bundle` supports `next` (App Router, Turbopack and webpack), `vite` (needs `build.manifest: true`) and `glob:<pattern>`. Without `ref` the checkout is the default branch, not the deployed commit; the action warns when they differ.

`perf-trail.budgets.json` sets minimum scores, maximum metrics and maximum JS per route. Pages and routes can override the defaults. A broken budget fails the job after the entry is saved, unless `fail-on-budget: false`.

```json
{
  "$schema": "https://raw.githubusercontent.com/bvffblvde/perf-trail/main/packages/core/schema/budgets.v1.json",
  "scores": { "performance": 95, "accessibility": 100 },
  "metrics": { "lcp": 2500, "cls": 0.05, "tbt": 200 },
  "pages": { "/en/cv": { "metrics": { "lcp": 2000 } } },
  "bundle": { "maxKiB": 160, "routes": { "/[locale]/admin": 300 } }
}
```

Every run writes a table with deltas to the job summary.

## Badges

Each run writes SVG badges to `badges/` in the data branch: `performance.svg` and `lcp.svg` for the first URL, `js.svg` for the largest route, and `pages/<page>/` for every page. Desktop runs use `badges/desktop/`.

```markdown
![Lighthouse](https://raw.githubusercontent.com/OWNER/REPO/perf-data/badges/performance.svg)
```

## Render the history

```tsx
import { fetchHistory } from "@perf-trail/client";
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
}
```

The components render pure SVG on the server with no client JavaScript, take `role="img"` with a text summary, and follow your page `color-scheme`.

## Inputs

| Input | Default | Notes |
|---|---|---|
| `urls` | required | newline list of URLs on one origin |
| `runs` | `3` | Lighthouse runs per URL, the median run is stored |
| `preset` | `mobile` | `mobile` or `desktop` |
| `data-branch` | `perf-data` | branch with `history.json`, created on the first run |
| `max-entries` | `300` | older entries are dropped |
| `environment-prefix` | `Production` | which `deployment_status` environments to measure |
| `use-deployment-url` | `false` | audit the per-deployment URL instead of `urls` |
| `store-commit-message` | `true` | store the first line of the commit message |
| `revalidate-url` | none | POST after the history is saved |
| `revalidate-secret` | none | sent as `Authorization: Bearer <secret>` |
| `bundle` | `off` | `next`, `vite`, `glob:<pattern>` or `off` |
| `build-command` | none | shell command run in `working-directory` before measuring the bundle |
| `working-directory` | `.` | where the app is built |
| `budgets` | none | path to `perf-trail.budgets.json` |
| `fail-on-budget` | `true` | fail the job on a broken budget, the entry is saved first |
| `github-token` | `github.token` | needs `contents: write` |

## History format

`history.json` is an array of entries, oldest first. Times are in milliseconds, CLS is unitless, scores are 0 to 100, bundle sizes are gzip bytes. The JSON Schema is in [packages/core/schema/history.v1.json](packages/core/schema/history.v1.json).

Outputs: `skipped`, `entry-json`, `budget-passed`, `summary-markdown`.

```json
{
  "v": 1,
  "sha": "86971f0d3165aab9e4dc6e3b4b86ef5ee55d1e3c",
  "date": "2026-10-03T22:43:13.000Z",
  "message": "fix: lazy load the editor",
  "url": "https://example.com",
  "preset": "mobile",
  "pages": {
    "/": {
      "scores": { "performance": 96, "accessibility": 100, "bestPractices": 100, "seo": 100 },
      "metrics": { "lcp": 2120, "cls": 0.01, "tbt": 42, "fcp": 1357, "si": 1400 }
    }
  }
}
```

## License

MIT
