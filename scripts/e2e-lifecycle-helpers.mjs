import { createHash } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

import {
  TEST_ROOT_MARKER,
  TEST_USER_HOME_VARIABLE,
} from "../packages/bootstrap/dist/lifecycle.js";
import { executeNpm, packLocalTarball } from "./local-package.mjs";

const execFileAsync = promisify(execFile);

export async function createE2eEnvironment(label) {
  const root = await mkdtemp(join(tmpdir(), `rkc-${label}-`));
  const userHome = join(root, "user-home");
  const artifacts = join(root, "artifacts");
  const repositories = join(root, "repositories");
  await Promise.all([
    mkdir(userHome, { recursive: true }),
    mkdir(artifacts, { recursive: true }),
    mkdir(repositories, { recursive: true }),
  ]);
  await writeFile(
    join(root, TEST_ROOT_MARKER),
    `${JSON.stringify({ root }, null, 2)}\n`,
    "utf8",
  );
  const packed = await packLocalTarball({
    cache: join(userHome, ".npm-cache", "pack"),
    destination: artifacts,
  });
  return {
    artifacts,
    metadata: packed.metadata,
    repositories,
    root,
    tarball: packed.tarball,
    userHome,
  };
}

export async function cleanupE2eEnvironment(environment) {
  await rm(environment.root, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 100,
  });
}

export async function runPackedRkc(environment, arguments_, cwd) {
  const invocation = packedRkcInvocation(environment, arguments_, cwd);
  return executeNpm(invocation.arguments, {
    cwd: invocation.cwd,
    env: invocation.env,
  });
}

export function spawnPackedRkc(
  environment,
  arguments_,
  cwd,
  extraEnvironment = {},
) {
  const invocation = packedRkcInvocation(
    environment,
    arguments_,
    cwd,
    extraEnvironment,
  );
  const npmExecPath = process.env.npm_execpath;
  const command =
    npmExecPath === undefined
      ? process.platform === "win32"
        ? "npm.cmd"
        : "npm"
      : process.execPath;
  const commandArguments =
    npmExecPath === undefined
      ? invocation.arguments
      : [npmExecPath, ...invocation.arguments];
  return spawn(command, commandArguments, {
    cwd: invocation.cwd,
    detached: process.platform !== "win32",
    env: invocation.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function captureProcessOutput(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk;
  });
  return () => ({ stderr, stdout });
}

export async function killProcessTree(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (child.pid === undefined)
    throw new Error("Spawned npm process has no PID.");
  try {
    if (process.platform === "win32") {
      await execFileAsync("taskkill", ["/PID", String(child.pid), "/T", "/F"]);
    } else {
      process.kill(-child.pid, "SIGKILL");
    }
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) throw error;
  }
  if (child.exitCode === null && child.signalCode === null) {
    await new Promise((resolveExit) => child.once("exit", resolveExit));
  }
}

export async function waitForPath(path, child, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await pathExists(path)) return;
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error("Installer exited before the awaited test marker.");
    }
    await delay(10);
  }
  throw new Error(`Timed out waiting for ${path}.`);
}

function packedRkcInvocation(
  environment,
  arguments_,
  cwd,
  extraEnvironment = {},
) {
  const childEnvironment = {
    ...process.env,
    [TEST_USER_HOME_VARIABLE]: environment.userHome,
    npm_config_audit: "false",
    npm_config_cache: join(environment.userHome, ".npm-cache", "exec"),
    npm_config_fund: "false",
    npm_config_offline: "true",
    npm_config_prefix: join(environment.userHome, ".npm-prefix"),
    npm_config_update_notifier: "false",
    ...extraEnvironment,
  };
  delete childEnvironment.npm_config_http_proxy;
  delete childEnvironment.NPM_CONFIG_HTTP_PROXY;
  return {
    arguments: [
      "exec",
      "--offline",
      "--yes",
      `--package=${environment.tarball}`,
      "--",
      "rkc",
      ...arguments_,
    ],
    cwd,
    env: childEnvironment,
  };
}

export async function digestTree(root, options = {}) {
  const base = resolve(root);
  const hash = createHash("sha256");
  await walk(base);
  return hash.digest("hex");

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = relative(base, path).replaceAll("\\", "/");
      if (
        options.excludeProjectState === true &&
        (relativePath === ".gitignore" ||
          relativePath === ".rkc" ||
          relativePath.startsWith(".rkc/"))
      ) {
        continue;
      }
      hash.update(`${entry.isDirectory() ? "d" : "f"}:${relativePath}\n`);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        hash.update(await readFile(path));
      } else {
        throw new Error(`Unsupported E2E fixture entry: ${path}`);
      }
    }
  }
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}
