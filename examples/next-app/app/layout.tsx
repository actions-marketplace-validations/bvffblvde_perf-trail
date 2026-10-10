import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "@perf-trail/react/styles.css";
import "./globals.css";
import { SiteFooter, SiteHeader } from "./_components/chrome";

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-sans",
  display: "optional",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://perf-trail.vercel.app"),
  title: {
    default: "perf-trail: performance history for every deploy",
    template: "%s | perf-trail",
  },
  description:
    "A GitHub Action that runs Lighthouse and measures JS after every production deploy, stores the history in a git branch, and renders it as SVG charts and badges.",
  openGraph: { type: "website", siteName: "perf-trail" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f4" },
    { media: "(prefers-color-scheme: dark)", color: "#131a24" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
