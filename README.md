# perf-trail

Performance history for every deploy. A GitHub Action audits your production site with Lighthouse after each deploy and appends the result to a JSON file in a git branch. No server, no database, no paid service.

Status: early development (phase 1 of 4). The action and the history format work; bundle sizes, budgets, charts and badges are coming next.

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
| `github-token` | `github.token` | needs `contents: write` |

## History format

`history.json` is an array of entries, oldest first. Times are in milliseconds, CLS is unitless, scores are 0 to 100, bundle sizes are gzip bytes. The JSON Schema is in [packages/core/schema/history.v1.json](packages/core/schema/history.v1.json).

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
