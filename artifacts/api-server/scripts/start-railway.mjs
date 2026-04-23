import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..", "..");
const apiRoot = resolve(scriptDir, "..");

await run("pnpm", ["--dir", repoRoot, "--filter", "@workspace/api-server", "run", "prisma:migrate:deploy"], {
  cwd: repoRoot,
});

await run("node", [resolve(apiRoot, "dist", "server.js")], {
  cwd: apiRoot,
  stdio: "inherit",
});

function run(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      env: process.env,
      shell: process.platform === "win32",
      stdio: options.stdio ?? "inherit",
      cwd: options.cwd,
    });

    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}.`));
    });
  });
}
