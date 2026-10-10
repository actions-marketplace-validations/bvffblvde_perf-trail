import Link from "next/link";
import { REPO } from "../_lib/history";

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
        <a href={`https://github.com/${REPO}`}>GitHub</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        perf-trail is MIT licensed. This site measures itself on every deploy with perf-trail, and
        the data lives in the{" "}
        <a href={`https://github.com/${REPO}/tree/perf-data`}>perf-data branch</a>.
      </p>
    </footer>
  );
}
