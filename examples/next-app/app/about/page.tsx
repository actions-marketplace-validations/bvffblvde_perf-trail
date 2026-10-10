import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "What perf-trail measures on this example site.",
};

export default function About() {
  return (
    <>
      <h1>About</h1>
      <p>
        perf-trail runs Lighthouse several times per page, keeps the median run and appends it to a
        history file in a git branch. No server and no database.
      </p>
    </>
  );
}
