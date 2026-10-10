import { exec, getExecOutput } from "@actions/exec";

export async function runBuild(command: string, cwd: string): Promise<void> {
  const code = await exec("bash", ["-eo", "pipefail", "-c", command], {
    cwd,
    ignoreReturnCode: true,
  });
  if (code !== 0) throw new Error(`build-command failed with exit code ${code}`);
}

export async function checkedOutSha(cwd: string): Promise<string | undefined> {
  const { exitCode, stdout } = await getExecOutput("git", ["rev-parse", "HEAD"], {
    cwd,
    silent: true,
    ignoreReturnCode: true,
  });
  return exitCode === 0 ? stdout.trim() : undefined;
}
