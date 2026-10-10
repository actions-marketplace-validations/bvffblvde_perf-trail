import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: [
    "@perf-trail/badge",
    "@perf-trail/client",
    "@perf-trail/core",
    "@perf-trail/react",
  ],
};

export default config;
