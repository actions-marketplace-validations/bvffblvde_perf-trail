import Link from "next/link";
import { REPO } from "../_lib/history";

export const MARKETPLACE = "https://github.com/marketplace/actions/perf-trail";
const PACKAGES = ["core", "client", "react", "badge", "bundle"];

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <path d="M3 24l7-8 6 5 7-11 6 4" />
      <circle cx="23" cy="10" r="2.6" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        <Mark />
        <span>perf-trail</span>
      </Link>
      <nav aria-label="Main">
        <Link href="/docs">Docs</Link>
        <a href={MARKETPLACE}>Marketplace</a>
        <a href={`https://github.com/${REPO}`}>GitHub</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <Link href="/" className="wordmark">
          <Mark />
          <span>perf-trail</span>
        </Link>
        <p>
          MIT licensed. This site measures itself on every deploy; the data lives in the{" "}
          <a href={`https://github.com/${REPO}/tree/perf-data`}>perf-data branch</a>.
        </p>
      </div>
      <nav aria-label="Project">
        <h2>Project</h2>
        <Link href="/docs">Docs</Link>
        <a href={MARKETPLACE}>GitHub Marketplace</a>
        <a href={`https://github.com/${REPO}`}>Source on GitHub</a>
        <a href={`https://github.com/${REPO}/releases`}>Releases</a>
      </nav>
      <nav aria-label="Packages">
        <h2>Packages</h2>
        {PACKAGES.map((name) => (
          <a key={name} href={`https://www.npmjs.com/package/@perf-trail/${name}`}>
            @perf-trail/{name}
          </a>
        ))}
      </nav>
    </footer>
  );
}
