import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { installedContext } from "./lifecycle.js";

export type DoctorMode = "cached" | "check" | "enable" | "disable";

export interface DoctorOptions {
  latestVersionSource?: () => Promise<string>;
  mode?: DoctorMode;
  now?: Date;
  testUserHome?: string;
}

export interface DoctorResult {
  mode: DoctorMode;
  update: CoreUpdateCheckResult;
}

export type AutomaticUpdateOperation =
  "rkc-create-docs" | "rkc-update-docs" | "rkc-audit-docs";

export interface PostOperationUpdateOptions {
  displayNotice: (notice: string) => Promise<void> | void;
  latestVersionSource?: () => Promise<string>;
  now?: Date;
  operation: AutomaticUpdateOperation;
  terminalResultKnown: boolean;
  testUserHome?: string;
}

export interface PostOperationUpdateResult {
  attempted: boolean;
  notice_displayed: boolean;
  operation: AutomaticUpdateOperation;
  skipped_reason?: "primary_result_not_terminal" | "best_effort_failure";
  update?: CoreUpdateCheckResult;
}

interface CoreUpdateCheckResult {
  performed: boolean;
  source: "live" | "cache" | "none";
  status: "UPDATE_AVAILABLE" | "UP_TO_DATE" | "AHEAD_OF_LATEST" | "UNKNOWN";
  installed_version: string;
  automatic_enabled: boolean;
  cache_recovered: boolean;
  notification_required: boolean;
  major_update: boolean;
  latest_version?: string;
  checked_at?: string;
  last_success_at?: string;
  failure_category?: string;
  skipped_reason?: string;
}

interface CoreUpdateModule {
  cachedCoreUpdateStatus: (
    statePath: string,
    installedVersion: string,
  ) => Promise<CoreUpdateCheckResult>;
  checkForCoreUpdate: (options: {
    forced: boolean;
    installedVersion: string;
    latestVersionSource?: () => Promise<string>;
    now?: Date;
    statePath: string;
  }) => Promise<CoreUpdateCheckResult>;
  recordUpdateNotification: (
    statePath: string,
    latestVersion: string,
  ) => Promise<void>;
  setAutomaticUpdateChecks: (
    statePath: string,
    enabled: boolean,
  ) => Promise<unknown>;
}

export async function runPostOperationUpdateDiscovery(
  options: PostOperationUpdateOptions,
): Promise<PostOperationUpdateResult> {
  if (!options.terminalResultKnown) {
    return {
      attempted: false,
      notice_displayed: false,
      operation: options.operation,
      skipped_reason: "primary_result_not_terminal",
    };
  }
  if (
    options.latestVersionSource !== undefined &&
    options.testUserHome === undefined
  ) {
    return {
      attempted: false,
      notice_displayed: false,
      operation: options.operation,
      skipped_reason: "best_effort_failure",
    };
  }

  try {
    const installation = await installedContext(options.testUserHome);
    const updateModule = await loadInstalledUpdateModule(
      installation.version_path,
    );
    const statePath = join(installation.rkc_root, "update-check.json");
    const update = await updateModule.checkForCoreUpdate({
      forced: false,
      installedVersion: installation.active_version,
      ...(options.latestVersionSource === undefined
        ? {}
        : { latestVersionSource: options.latestVersionSource }),
      ...(options.now === undefined ? {} : { now: options.now }),
      statePath,
    });

    if (!update.notification_required || update.latest_version === undefined) {
      return {
        attempted: true,
        notice_displayed: false,
        operation: options.operation,
        update,
      };
    }

    await options.displayNotice(formatAutomaticUpdateNotice(update));
    await updateModule.recordUpdateNotification(
      statePath,
      update.latest_version,
    );
    return {
      attempted: true,
      notice_displayed: true,
      operation: options.operation,
      update: { ...update, notification_required: false },
    };
  } catch {
    return {
      attempted: true,
      notice_displayed: false,
      operation: options.operation,
      skipped_reason: "best_effort_failure",
    };
  }
}

export async function doctor(
  options: DoctorOptions = {},
): Promise<DoctorResult> {
  if (
    options.latestVersionSource !== undefined &&
    options.testUserHome === undefined
  ) {
    throw new Error(
      "The injected update source is permitted only in a marked test home.",
    );
  }
  const mode = options.mode ?? "cached";
  const installation = await installedContext(options.testUserHome);
  const updateModule = await loadInstalledUpdateModule(
    installation.version_path,
  );
  const statePath = join(installation.rkc_root, "update-check.json");

  if (mode === "enable" || mode === "disable") {
    await updateModule.setAutomaticUpdateChecks(statePath, mode === "enable");
  }
  const update =
    mode === "check"
      ? await updateModule.checkForCoreUpdate({
          forced: true,
          installedVersion: installation.active_version,
          ...(options.latestVersionSource === undefined
            ? {}
            : { latestVersionSource: options.latestVersionSource }),
          ...(options.now === undefined ? {} : { now: options.now }),
          statePath,
        })
      : await updateModule.cachedCoreUpdateStatus(
          statePath,
          installation.active_version,
        );
  return { mode, update };
}

async function loadInstalledUpdateModule(
  versionPath: string,
): Promise<CoreUpdateModule> {
  const entry = join(
    versionPath,
    "node_modules",
    "@rkc",
    "core",
    "dist",
    "index.js",
  );
  const loaded: unknown = await import(pathToFileURL(entry).href);
  if (typeof loaded !== "object" || loaded === null) {
    throw new Error("The installed RKC update module is unavailable.");
  }
  const record = loaded as Record<string, unknown>;
  if (
    typeof record.cachedCoreUpdateStatus !== "function" ||
    typeof record.checkForCoreUpdate !== "function" ||
    typeof record.recordUpdateNotification !== "function" ||
    typeof record.setAutomaticUpdateChecks !== "function"
  ) {
    throw new Error(
      "The installed RKC core has no compatible update capability.",
    );
  }
  return {
    cachedCoreUpdateStatus:
      record.cachedCoreUpdateStatus as CoreUpdateModule["cachedCoreUpdateStatus"],
    checkForCoreUpdate:
      record.checkForCoreUpdate as CoreUpdateModule["checkForCoreUpdate"],
    recordUpdateNotification:
      record.recordUpdateNotification as CoreUpdateModule["recordUpdateNotification"],
    setAutomaticUpdateChecks:
      record.setAutomaticUpdateChecks as CoreUpdateModule["setAutomaticUpdateChecks"],
  };
}

function formatAutomaticUpdateNotice(update: CoreUpdateCheckResult): string {
  const checkedAt = update.checked_at ?? update.last_success_at ?? "unknown";
  const compatibility = update.major_update
    ? "This is a major-version update; review compatibility and migration guidance before updating."
    : "Review the release guidance before updating.";
  return [
    "RKC update notice (separate from the completed repository operation):",
    `Installed: ${update.installed_version}`,
    `Available: ${update.latest_version ?? "unknown"}`,
    `Checked: ${checkedAt}`,
    compatibility,
    "No update was installed automatically.",
    "Recommended update command: npx repository-knowledge-compiler@latest self-update",
  ].join("\n");
}
