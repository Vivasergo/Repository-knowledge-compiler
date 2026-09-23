import { execFile } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function packLocalTarball(options) {
  const destination = resolve(options.destination);
  const cache = resolve(options.cache);
  await mkdir(destination, { recursive: true });
  await mkdir(cache, { recursive: true });

  const result = await executeNpm(
    [
      "pack",
      "--offline",
      "--ignore-scripts",
      "--json",
      "--workspace=repository-knowledge-compiler",
      `--pack-destination=${destination}`,
    ],
    {
      cwd: resolve("."),
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_cache: cache,
        npm_config_fund: "false",
        npm_config_offline: "true",
        npm_config_update_notifier: "false",
      },
    },
  );
  const metadata = parsePackMetadata(result.stdout);
  const tarball = join(destination, metadata.filename);
  const tarballStat = await stat(tarball);
  if (!tarballStat.isFile() || tarballStat.size === 0) {
    throw new Error("Local package tarball was not created correctly.");
  }
  return { metadata, tarball };
}

export async function executeNpm(arguments_, options) {
  const npmExecPath = process.env.npm_execpath;
  const command =
    npmExecPath === undefined
      ? process.platform === "win32"
        ? "npm.cmd"
        : "npm"
      : process.execPath;
  const commandArguments =
    npmExecPath === undefined ? arguments_ : [npmExecPath, ...arguments_];
  return execFileAsync(command, commandArguments, {
    ...options,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
}

function parsePackMetadata(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error("npm pack did not return valid JSON metadata.", {
      cause: error,
    });
  }
  if (
    !Array.isArray(parsed) ||
    parsed.length !== 1 ||
    typeof parsed[0] !== "object" ||
    parsed[0] === null ||
    parsed[0].name !== "repository-knowledge-compiler" ||
    typeof parsed[0].version !== "string" ||
    typeof parsed[0].filename !== "string" ||
    !Array.isArray(parsed[0].files)
  ) {
    throw new Error("npm pack returned incompatible package metadata.");
  }
  return parsed[0];
}
