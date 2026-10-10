import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "packages");
const out = mkdtempSync(join(tmpdir(), "perf-trail-publish-"));

const published = (name, version) => {
  try {
    execFileSync("npm", ["view", `${name}@${version}`, "version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
};

for (const dir of readdirSync(root)) {
  const cwd = join(root, dir);
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  if (pkg.private) continue;
  if (published(pkg.name, pkg.version)) {
    console.log(`${pkg.name}@${pkg.version} is already on npm`);
    continue;
  }
  execFileSync("pnpm", ["pack", "--pack-destination", out], { cwd, stdio: "pipe" });
  const tarball = join(out, `${pkg.name.replace("@", "").replace("/", "-")}-${pkg.version}.tgz`);
  execFileSync("npm", ["publish", tarball, "--access", "public", "--provenance"], {
    stdio: "inherit",
  });
  console.log(`New tag: ${pkg.name}@${pkg.version}`);
}
