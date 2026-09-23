import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export const UPDATE_CHECK_SUCCESS_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const UPDATE_CHECK_FAILURE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type UpdateComparisonStatus =
  "UPDATE_AVAILABLE" | "UP_TO_DATE" | "AHEAD_OF_LATEST" | "UNKNOWN";

export type UpdateFailureCategory =
  "network" | "timeout" | "registry" | "invalid_response" | "invalid_version";

export interface UpdateCheckState {
  format_version: 1;
  automatic_enabled: boolean;
  installed_version?: string;
  latest_version?: string;
  comparison_status: UpdateComparisonStatus;
  last_attempt_at?: string;
  last_attempt_succeeded?: boolean;
  last_success_at?: string;
  last_failure_category?: UpdateFailureCategory;
  last_notified_version?: string;
}

export interface UpdateCheckResult {
  performed: boolean;
  source: "live" | "cache" | "none";
  status: UpdateComparisonStatus;
  installed_version: string;
  automatic_enabled: boolean;
  cache_recovered: boolean;
  notification_required: boolean;
  major_update: boolean;
  latest_version?: string;
  checked_at?: string;
  last_success_at?: string;
  failure_category?: UpdateFailureCategory;
  skipped_reason?: "disabled" | "success_cadence" | "failure_cadence";
}

export interface CheckForUpdateOptions {
  forced?: boolean;
  installedVersion: string;
  latestVersionSource?: () => Promise<string>;
  now?: Date;
  packageName?: string;
  statePath: string;
}

interface ParsedSemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<number | string>;
}

interface StateReadResult {
  corrupt: boolean;
  state: UpdateCheckState;
}

export async function checkForCoreUpdate(
  options: CheckForUpdateOptions,
): Promise<UpdateCheckResult> {
  parseSemVer(options.installedVersion);
  const now = options.now ?? new Date();
  const stateRead = await readUpdateCheckState(options.statePath);
  const state = stateRead.state;
  const forced = options.forced === true;
  const skippedReason = forced
    ? undefined
    : automaticSkipReason(state, options.installedVersion, now);
  if (skippedReason !== undefined) {
    return resultFromState(
      state,
      options.installedVersion,
      stateRead.corrupt,
      skippedReason,
    );
  }

  const checkedAt = now.toISOString();
  try {
    const latestVersion = await (
      options.latestVersionSource ??
      (() => fetchLatestStableVersion(options.packageName))
    )();
    const latest = parseSemVer(latestVersion);
    if (latest.prerelease.length > 0) {
      throw new UpdateCheckError(
        "invalid_version",
        "The Registry latest tag is not a stable version.",
      );
    }
    const status = compareVersions(options.installedVersion, latestVersion);
    const nextState: UpdateCheckState = {
      ...state,
      format_version: 1,
      installed_version: options.installedVersion,
      latest_version: latestVersion,
      comparison_status: status,
      last_attempt_at: checkedAt,
      last_attempt_succeeded: true,
      last_success_at: checkedAt,
    };
    delete nextState.last_failure_category;
    await writeUpdateCheckState(options.statePath, nextState);
    return {
      performed: true,
      source: "live",
      status,
      installed_version: options.installedVersion,
      automatic_enabled: nextState.automatic_enabled,
      cache_recovered: stateRead.corrupt,
      notification_required:
        status === "UPDATE_AVAILABLE" &&
        nextState.last_notified_version !== latestVersion,
      major_update:
        status === "UPDATE_AVAILABLE" &&
        parseSemVer(options.installedVersion).major !== latest.major,
      latest_version: latestVersion,
      checked_at: checkedAt,
      last_success_at: checkedAt,
    };
  } catch (error) {
    const failureCategory = classifyUpdateFailure(error);
    const nextState: UpdateCheckState = {
      ...state,
      format_version: 1,
      automatic_enabled: state.automatic_enabled,
      comparison_status: state.comparison_status,
      last_attempt_at: checkedAt,
      last_attempt_succeeded: false,
      last_failure_category: failureCategory,
    };
    await writeUpdateCheckState(options.statePath, nextState);
    return {
      performed: true,
      source: "live",
      status: "UNKNOWN",
      installed_version: options.installedVersion,
      automatic_enabled: nextState.automatic_enabled,
      cache_recovered: stateRead.corrupt,
      notification_required: false,
      major_update: false,
      checked_at: checkedAt,
      ...(nextState.last_success_at === undefined
        ? {}
        : { last_success_at: nextState.last_success_at }),
      failure_category: failureCategory,
    };
  }
}

export async function cachedCoreUpdateStatus(
  statePath: string,
  installedVersion: string,
): Promise<UpdateCheckResult> {
  parseSemVer(installedVersion);
  const stateRead = await readUpdateCheckState(statePath);
  return resultFromState(stateRead.state, installedVersion, stateRead.corrupt);
}

export async function setAutomaticUpdateChecks(
  statePath: string,
  enabled: boolean,
): Promise<UpdateCheckState> {
  const stateRead = await readUpdateCheckState(statePath);
  const nextState = { ...stateRead.state, automatic_enabled: enabled };
  await writeUpdateCheckState(statePath, nextState);
  return nextState;
}

export async function recordUpdateNotification(
  statePath: string,
  latestVersion: string,
): Promise<void> {
  parseSemVer(latestVersion);
  const stateRead = await readUpdateCheckState(statePath);
  if (
    stateRead.corrupt ||
    stateRead.state.comparison_status !== "UPDATE_AVAILABLE" ||
    stateRead.state.latest_version !== latestVersion
  ) {
    throw new Error(
      "Cannot record a notification without matching update evidence.",
    );
  }
  await writeUpdateCheckState(statePath, {
    ...stateRead.state,
    last_notified_version: latestVersion,
  });
}

export function compareVersions(
  installedVersion: string,
  latestVersion: string,
): UpdateComparisonStatus {
  const installed = parseSemVer(installedVersion);
  const latest = parseSemVer(latestVersion);
  const comparison = compareParsedSemVer(installed, latest);
  if (comparison < 0) return "UPDATE_AVAILABLE";
  if (comparison > 0) return "AHEAD_OF_LATEST";
  return "UP_TO_DATE";
}

function automaticSkipReason(
  state: UpdateCheckState,
  installedVersion: string,
  now: Date,
): UpdateCheckResult["skipped_reason"] | undefined {
  if (!state.automatic_enabled) return "disabled";
  if (state.installed_version !== installedVersion) return undefined;
  if (state.last_attempt_at === undefined) return undefined;
  const lastAttempt = Date.parse(state.last_attempt_at);
  if (!Number.isFinite(lastAttempt)) return undefined;
  const interval = state.last_attempt_succeeded
    ? UPDATE_CHECK_SUCCESS_INTERVAL_MS
    : UPDATE_CHECK_FAILURE_INTERVAL_MS;
  if (now.getTime() - lastAttempt >= interval) return undefined;
  return state.last_attempt_succeeded ? "success_cadence" : "failure_cadence";
}

function resultFromState(
  state: UpdateCheckState,
  installedVersion: string,
  corrupt: boolean,
  skippedReason?: UpdateCheckResult["skipped_reason"],
): UpdateCheckResult {
  const compatibleCache = state.installed_version === installedVersion;
  const status = compatibleCache ? state.comparison_status : "UNKNOWN";
  const latestVersion = compatibleCache ? state.latest_version : undefined;
  return {
    performed: false,
    source: compatibleCache && state.last_success_at ? "cache" : "none",
    status,
    installed_version: installedVersion,
    automatic_enabled: state.automatic_enabled,
    cache_recovered: corrupt,
    notification_required:
      status === "UPDATE_AVAILABLE" &&
      latestVersion !== undefined &&
      state.last_notified_version !== latestVersion,
    major_update:
      status === "UPDATE_AVAILABLE" &&
      latestVersion !== undefined &&
      parseSemVer(installedVersion).major !== parseSemVer(latestVersion).major,
    ...(latestVersion === undefined ? {} : { latest_version: latestVersion }),
    ...(state.last_success_at === undefined
      ? {}
      : { last_success_at: state.last_success_at }),
    ...(skippedReason === undefined ? {} : { skipped_reason: skippedReason }),
  };
}

async function fetchLatestStableVersion(
  packageName = "repository-knowledge-compiler",
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(packageName)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new UpdateCheckError("timeout", error.message);
    }
    throw new UpdateCheckError(
      "network",
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!response.ok) {
    throw new UpdateCheckError(
      "registry",
      `Registry returned HTTP ${response.status}.`,
    );
  }
  let value: unknown;
  try {
    value = await response.json();
  } catch (error) {
    throw new UpdateCheckError(
      "invalid_response",
      error instanceof Error ? error.message : String(error),
    );
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("dist-tags" in value) ||
    typeof value["dist-tags"] !== "object" ||
    value["dist-tags"] === null ||
    !("latest" in value["dist-tags"]) ||
    typeof value["dist-tags"].latest !== "string"
  ) {
    throw new UpdateCheckError(
      "invalid_response",
      "Registry response has no stable latest tag.",
    );
  }
  return value["dist-tags"].latest;
}

async function readUpdateCheckState(
  statePath: string,
): Promise<StateReadResult> {
  try {
    const value: unknown = JSON.parse(await readFile(statePath, "utf8"));
    return { corrupt: false, state: validateUpdateCheckState(value) };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { corrupt: false, state: defaultUpdateCheckState() };
    }
    return { corrupt: true, state: defaultUpdateCheckState() };
  }
}

function validateUpdateCheckState(value: unknown): UpdateCheckState {
  if (typeof value !== "object" || value === null) {
    throw new Error("Update-check state is incompatible.");
  }
  const record = value as Record<string, unknown>;
  const automaticEnabled = record.automatic_enabled;
  const comparisonStatus = record.comparison_status;
  if (
    record.format_version !== 1 ||
    typeof automaticEnabled !== "boolean" ||
    !isComparisonStatus(comparisonStatus)
  ) {
    throw new Error("Update-check state is incompatible.");
  }
  const optionalStrings = [
    "installed_version",
    "latest_version",
    "last_attempt_at",
    "last_success_at",
    "last_notified_version",
  ] as const;
  for (const field of optionalStrings) {
    if (record[field] !== undefined && typeof record[field] !== "string") {
      throw new Error(`Update-check state field ${field} is invalid.`);
    }
  }
  if (
    record.last_attempt_succeeded !== undefined &&
    typeof record.last_attempt_succeeded !== "boolean"
  ) {
    throw new Error("Update-check attempt status is invalid.");
  }
  if (
    record.last_failure_category !== undefined &&
    !isFailureCategory(record.last_failure_category)
  ) {
    throw new Error("Update-check failure category is invalid.");
  }
  return {
    format_version: 1,
    automatic_enabled: automaticEnabled,
    comparison_status: comparisonStatus,
    ...(typeof record.installed_version === "string"
      ? { installed_version: record.installed_version }
      : {}),
    ...(typeof record.latest_version === "string"
      ? { latest_version: record.latest_version }
      : {}),
    ...(typeof record.last_attempt_at === "string"
      ? { last_attempt_at: record.last_attempt_at }
      : {}),
    ...(typeof record.last_attempt_succeeded === "boolean"
      ? { last_attempt_succeeded: record.last_attempt_succeeded }
      : {}),
    ...(typeof record.last_success_at === "string"
      ? { last_success_at: record.last_success_at }
      : {}),
    ...(isFailureCategory(record.last_failure_category)
      ? { last_failure_category: record.last_failure_category }
      : {}),
    ...(typeof record.last_notified_version === "string"
      ? { last_notified_version: record.last_notified_version }
      : {}),
  };
}

async function writeUpdateCheckState(
  statePath: string,
  state: UpdateCheckState,
): Promise<void> {
  await mkdir(dirname(statePath), { recursive: true });
  const temporary = `${statePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporary, statePath);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function defaultUpdateCheckState(): UpdateCheckState {
  return {
    format_version: 1,
    automatic_enabled: true,
    comparison_status: "UNKNOWN",
  };
}

function parseSemVer(version: string): ParsedSemVer {
  const match =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.exec(
      version,
    );
  if (!match) {
    throw new UpdateCheckError("invalid_version", `Invalid SemVer: ${version}`);
  }
  const prerelease = (match[4] ?? "")
    .split(".")
    .filter((identifier) => identifier !== "")
    .map((identifier) => {
      if (/^\d+$/u.test(identifier)) {
        if (identifier.length > 1 && identifier.startsWith("0")) {
          throw new UpdateCheckError(
            "invalid_version",
            `Invalid SemVer prerelease: ${version}`,
          );
        }
        return Number(identifier);
      }
      return identifier;
    });
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  };
}

function compareParsedSemVer(left: ParsedSemVer, right: ParsedSemVer): number {
  for (const field of ["major", "minor", "patch"] as const) {
    if (left[field] !== right[field]) return left[field] - right[field];
  }
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    if (
      typeof leftIdentifier === "number" &&
      typeof rightIdentifier === "string"
    )
      return -1;
    if (
      typeof leftIdentifier === "string" &&
      typeof rightIdentifier === "number"
    )
      return 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }
  return 0;
}

function classifyUpdateFailure(error: unknown): UpdateFailureCategory {
  return error instanceof UpdateCheckError
    ? error.category
    : "invalid_response";
}

function isComparisonStatus(value: unknown): value is UpdateComparisonStatus {
  return [
    "UPDATE_AVAILABLE",
    "UP_TO_DATE",
    "AHEAD_OF_LATEST",
    "UNKNOWN",
  ].includes(String(value));
}

function isFailureCategory(value: unknown): value is UpdateFailureCategory {
  return [
    "network",
    "timeout",
    "registry",
    "invalid_response",
    "invalid_version",
  ].includes(String(value));
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

class UpdateCheckError extends Error {
  constructor(
    readonly category: UpdateFailureCategory,
    message: string,
  ) {
    super(message);
    this.name = "UpdateCheckError";
  }
}
