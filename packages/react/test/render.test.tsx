import type { Entry, History } from "@perf-trail/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LatestDeployCard, PerfHistoryChart, PerfHistoryTable, seriesFor } from "../src/index.ts";

function entry(i: number, lcp: number, overrides: Partial<Entry> = {}): Entry {
  return {
    v: 1,
    sha: (1_000_000 + i).toString(16).padStart(7, "0").repeat(2).slice(0, 14),
    date: new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString(),
    message: `feat: change ${i}`,
    url: "https://example.com",
    preset: "mobile",
    pages: {
      "/": {
        scores: {
          performance: lcp > 2500 ? 88 : 98,
          accessibility: 100,
          bestPractices: 96,
          seo: 100,
        },
        metrics: { lcp, cls: 0.01, tbt: 40 + (i % 5), fcp: 800, si: 900 },
      },
    },
    bundle: { routes: { "/": 120_000 + i * 10, "/about": 110_000 } },
    ...overrides,
  };
}

const series = (n: number, lcp: (i: number) => number): History =>
  Array.from({ length: n }, (_, i) => entry(i, lcp(i)));

const html = (node: React.ReactNode) => renderToStaticMarkup(node);

describe("PerfHistoryChart", () => {
  it("renders an empty state with an accessible name", () => {
    const out = html(<PerfHistoryChart history={[]} metric="lcp" page="/" />);
    expect(out).toContain('role="img"');
    expect(out).toContain("No deploys measured yet");
    expect(out).toMatchSnapshot();
  });

  it("renders a single point", () => {
    const out = html(<PerfHistoryChart history={series(1, () => 1400)} metric="lcp" page="/" />);
    expect(out).toContain("LCP 1.4 s on the only measured deploy.");
    expect(out).toMatchSnapshot();
  });

  it("marks deploys over budget", () => {
    const history = series(6, (i) => (i === 3 ? 3100 : 1800 + i * 50));
    const out = html(<PerfHistoryChart history={history} metric="lcp" page="/" budget={2500} />);
    expect(out.match(/pt-breach/g)).toHaveLength(1);
    expect(out).toContain("1 of 6 outside the 2.5 s budget.");
    expect(out).toContain("budget 2.5 s");
    expect(out).toMatchSnapshot();
  });

  it("keeps 300 points light", () => {
    const history = series(300, (i) => 1500 + Math.round(400 * Math.sin(i / 12)));
    const out = html(<PerfHistoryChart history={history} metric="lcp" page="/" budget={1800} />);
    const markers = out.match(/<circle/g)?.length ?? 0;
    const breaches = out.match(/pt-breach/g)?.length ?? 0;
    expect(markers).toBe(breaches + 1);
    expect(out).toContain("over 300 deploys");
    expect(out.length).toBeLessThan(80_000);
    expect(out).toMatchSnapshot();
  });

  it("charts scores and JS", () => {
    const history = series(3, () => 1400);
    expect(html(<PerfHistoryChart history={history} metric="performance" page="/" />)).toContain(
      "Performance went from 98 to 98 over 3 deploys",
    );
    expect(html(<PerfHistoryChart history={history} metric="js" route="/about" />)).toContain(
      "JS (gzip) went from 107.4 KiB to 107.4 KiB",
    );
  });

  it("filters by preset", () => {
    const history = [...series(2, () => 1400), entry(9, 900, { preset: "desktop" })];
    expect(seriesFor(history, { metric: "lcp", preset: "desktop" })).toHaveLength(1);
  });
});

describe("LatestDeployCard", () => {
  it("shows the latest deploy with deltas and a commit link", () => {
    const history = [entry(0, 2000), entry(1, 1800, { budgets: { passed: true, failures: [] } })];
    const out = html(<LatestDeployCard history={history} repo="o/r" />);
    expect(out).toContain(`href="https://github.com/o/r/commit/${history[1]?.sha}"`);
    expect(out).toContain("feat: change 1");
    expect(out).toContain(
      '<span aria-hidden="true">-0.2 s</span><span class="pt-sr">down by 0.2 s</span>',
    );
    expect(out).toContain("All budgets passed.");
    expect(out).toMatchSnapshot();
  });

  it("invites setup when empty", () => {
    expect(html(<LatestDeployCard history={[]} />)).toContain("first production deploy");
  });
});

describe("PerfHistoryTable", () => {
  it("lists the newest deploys first", () => {
    const out = html(<PerfHistoryTable history={series(15, (i) => 1000 + i)} limit={3} />);
    expect(out.match(/<tr\b/g)).toHaveLength(4);
    expect(out.indexOf("feat: change 14")).toBeLessThan(out.indexOf("feat: change 13"));
    expect(out).toContain("Last 3 deploys of /, newest first");
  });
});

describe("labels and interactivity", () => {
  const uk = {
    locale: "uk",
    metrics: { lcp: "LCP" },
    empty: "Ще немає виміряних деплоїв",
    budgetLine: (value: string) => `бюджет ${value}`,
    summary: ({ count, last }: { count: number; last: string }) =>
      `${count} деплоїв, останній ${last}.`,
    deltaDown: (value: string) => `менше на ${value}`,
    columns: { commit: "Коміт", budgets: "Бюджети" },
    passed: "пройдено",
  };

  it("translates the chart", () => {
    const out = html(
      <PerfHistoryChart
        history={series(3, () => 1400)}
        metric="lcp"
        page="/"
        budget={2500}
        labels={uk}
      />,
    );
    expect(out).toContain("3 деплоїв, останній 1.4 s.");
    expect(out).toContain("бюджет 2.5 s");
    expect(html(<PerfHistoryChart history={[]} metric="lcp" labels={uk} />)).toContain(
      "Ще немає виміряних деплоїв",
    );
  });

  it("formats dates in the given locale", () => {
    const out = html(<PerfHistoryTable history={series(1, () => 1400)} labels={uk} />);
    expect(out).toContain("Коміт");
    expect(out).toContain(
      new Date(Date.UTC(2026, 0, 1)).toLocaleDateString("uk", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
    );
  });

  it("renders one focusable stop per chart when interactive", () => {
    const out = html(
      <PerfHistoryChart history={series(5, (i) => 1400 + i)} metric="lcp" page="/" interactive />,
    );
    expect(out).toContain('role="toolbar"');
    expect(out.match(/<button/g)).toHaveLength(5);
    expect(out.match(/tabindex="0"/g)).toHaveLength(1);
    expect(out).not.toContain('<circle class="pt-point"');
  });

  it("shows scores for several pages, a chosen JS route and budget limits", () => {
    const history = [entry(0, 2000), entry(1, 1800, { budgets: { passed: true, failures: [] } })];
    for (const e of history) e.pages["/cv"] = e.pages["/"] as Entry["pages"][string];
    const out = html(
      <LatestDeployCard
        history={history}
        pages={["/", "/cv"]}
        jsRoute="/about"
        budgets={{ metrics: { lcp: 2500 }, bundle: { maxKiB: 160 } }}
      />,
    );
    expect(out.match(/class="pt-page-name"/g)).toHaveLength(2);
    expect(out).toContain("JS on /about");
    expect(out).toContain('<span class="pt-limit">budget 2.5 s</span>');
    expect(out).toContain('<span class="pt-limit">budget 160 KiB</span>');
  });

  it("adds a budgets column when entries carry budgets", () => {
    const history = [entry(0, 2000, { budgets: { passed: false, failures: ["x"] } })];
    const out = html(<PerfHistoryTable history={history} labels={uk} />);
    expect(out).toContain("Бюджети");
    expect(out).toContain('<td class="pt-poor">failed</td>');
  });
});
