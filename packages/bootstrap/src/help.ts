import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { installedContext } from "./lifecycle.js";

export interface HelpOptions {
  action?: string;
  repositoryRoot?: string;
  testUserHome?: string;
  topic?: string;
}

export interface HelpResult {
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly mode: "explanation" | "route";
  readonly module: Readonly<Record<string, unknown>>;
  readonly project_context?: Readonly<Record<string, unknown>>;
  readonly route?: Readonly<Record<string, unknown>>;
}

interface InstalledHelpModule {
  resolveRkcHelp: (request: {
    action?: string;
    distribution_version: string;
    repository_root?: string;
    topic?: string;
  }) => Promise<HelpResult>;
}

export async function help(options: HelpOptions = {}): Promise<HelpResult> {
  const installation = await installedContext(options.testUserHome);
  const storedManifest = await readJson(
    join(installation.version_path, "self-description-manifest.json"),
  );
  if (storedManifest.distribution_version !== installation.active_version) {
    throw new Error(
      "Installed RKC self-description does not match the active core version.",
    );
  }
  const helpModule = await loadInstalledHelpModule(installation.version_path);
  const result = await helpModule.resolveRkcHelp({
    distribution_version: installation.active_version,
    ...(options.action === undefined ? {} : { action: options.action }),
    ...(options.repositoryRoot === undefined
      ? {}
      : { repository_root: options.repositoryRoot }),
    ...(options.topic === undefined ? {} : { topic: options.topic }),
  });
  if (JSON.stringify(result.manifest) !== JSON.stringify(storedManifest)) {
    throw new Error(
      "Installed RKC self-description has drifted from the active core.",
    );
  }
  return result;
}

async function loadInstalledHelpModule(
  versionPath: string,
): Promise<InstalledHelpModule> {
  const entry = join(
    versionPath,
    "node_modules",
    "@rkc",
    "core",
    "dist",
    "index.js",
  );
  const loaded: unknown = await import(pathToFileURL(entry).href);
  if (
    typeof loaded !== "object" ||
    loaded === null ||
    !("resolveRkcHelp" in loaded) ||
    typeof loaded.resolveRkcHelp !== "function"
  ) {
    throw new Error(
      "The installed RKC core has no compatible help capability.",
    );
  }
  return {
    resolveRkcHelp:
      loaded.resolveRkcHelp as InstalledHelpModule["resolveRkcHelp"],
  };
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Installed RKC self-description manifest is invalid.");
  }
  return value as Record<string, unknown>;
}
