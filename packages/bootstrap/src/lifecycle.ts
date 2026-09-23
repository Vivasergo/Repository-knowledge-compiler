import { randomUUID } from "node:crypto";
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./identity.js";

export const TEST_USER_HOME_VARIABLE = "RKC_TEST_USER_HOME";
export const TEST_ROOT_MARKER = ".rkc-test-root.json";
export const TEST_PAUSE_AFTER_PREPARED_VARIABLE =
  "RKC_TEST_PAUSE_AFTER_PREPARED_FILE";

const skillNames = [
  "rkc-help",
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
] as const;

interface PayloadManifest {
  format_version: number;
  package_name: string;
  version: string;
  core_package: string;
  host_boundary_entry: string;
  self_description_manifest: string;
  documentation_master_prompt: string;
  documentation_prompt_version: string;
  skills: string[];
}

interface CurrentInstallation {
  format_version: number;
  package_name: string;
  active_version: string;
  version_path: string;
  activated_at: string;
  activation_id?: string;
}

interface ActivationHistory {
  format_version: 1;
  activations: Array<{ activated_at: string; version: string }>;
}

interface InstallTransaction {
  format_version: number;
  transaction_id: string;
  phase: "prepared" | "committed";
  staging_root: string;
  backup_root: string;
  had_current: boolean;
  skills: Array<{ had_previous: boolean; name: string }>;
  claude_staging_root?: string;
  claude_backup_root?: string;
  claude_links?: Array<{ had_previous: boolean; name: string }>;
}

export interface InstallResult {
  user_home: string;
  rkc_root: string;
  active_version: string;
  version_path: string;
  skills: readonly string[];
  repeated: boolean;
}

export interface InstallationContext {
  user_home: string;
  rkc_root: string;
  active_version: string;
  version_path: string;
}

export interface InstallOptions {
  now?: Date;
  payloadRoot?: string;
  testInterruptionAfterSkill?: number;
  testPauseAfterPreparedFile?: string;
  testUserHome?: string;
  testVersion?: string;
}

export interface SelfUpdateResult extends InstallResult {
  removed_versions: string[];
  retained_versions: string[];
}

export type UninstallTargetStatus =
  "present" | "removed" | "absent" | "preserved" | "failed";

export interface UninstallTargetResult {
  path: string;
  status: UninstallTargetStatus;
  error?: string;
}

export interface UninstallResult {
  confirmed: boolean;
  dry_run: boolean;
  success: boolean;
  targets: UninstallTargetResult[];
}

export interface UninstallOptions {
  confirmed?: boolean;
  dryRun?: boolean;
  testRemoveTarget?: (path: string) => Promise<void>;
  testUserHome?: string;
}

export async function install(
  options: InstallOptions = {},
): Promise<InstallResult> {
  const userHome = await resolveUserHome(options.testUserHome);
  const payloadRoot = resolve(
    options.payloadRoot ??
      fileURLToPath(new URL("../payload", import.meta.url)),
  );
  const expectedVersion = options.testVersion ?? FOUNDATION_VERSION;
  if (options.testVersion !== undefined && options.testUserHome === undefined) {
    throw new Error("A test version is permitted only in a marked test home.");
  }
  if (
    options.testPauseAfterPreparedFile !== undefined &&
    options.testUserHome === undefined
  ) {
    throw new Error(
      "The prepared-transaction pause is permitted only in a marked test home.",
    );
  }
  if (
    options.testPauseAfterPreparedFile !== undefined &&
    options.testInterruptionAfterSkill !== undefined
  ) {
    throw new Error("Installer test interruption controls cannot be combined.");
  }
  validateVersionPathSegment(expectedVersion);
  const manifest = await readPayloadManifest(payloadRoot, expectedVersion);
  const now = options.now ?? new Date();
  const rkcRoot = join(userHome, ".rkc");
  const versionPath = join(rkcRoot, "versions", manifest.version);
  const repeated = await pathExists(versionPath);

  await mkdir(join(rkcRoot, "versions"), { recursive: true });
  await mkdir(join(rkcRoot, ".staging"), { recursive: true });
  await recoverPendingActivation(userHome, rkcRoot);

  if (repeated) {
    await validateInstalledVersion(versionPath, manifest.version);
  } else {
    await installVersion(payloadRoot, versionPath, rkcRoot, manifest, now);
  }

  const current = await readCurrentInstallation(rkcRoot);
  const activatedAt =
    current?.active_version === manifest.version
      ? current.activated_at
      : now.toISOString();

  try {
    await activateInstallation(
      userHome,
      rkcRoot,
      payloadRoot,
      versionPath,
      manifest,
      activatedAt,
      options.testInterruptionAfterSkill,
      options.testPauseAfterPreparedFile,
    );
  } catch (error) {
    if (error instanceof SimulatedInterruptionError) throw error;
    await recoverPendingActivation(userHome, rkcRoot);
    throw error;
  }
  await recordSuccessfulActivation(rkcRoot, manifest.version, activatedAt);

  return {
    user_home: userHome,
    rkc_root: rkcRoot,
    active_version: manifest.version,
    version_path: versionPath,
    skills: skillNames,
    repeated,
  };
}

export async function installedVersion(testUserHome?: string): Promise<string> {
  return (await installedContext(testUserHome)).active_version;
}

export async function installedContext(
  testUserHome?: string,
): Promise<InstallationContext> {
  const userHome = await resolveUserHome(testUserHome);
  const rkcRoot = join(userHome, ".rkc");
  const current = await readCurrentInstallation(rkcRoot);
  if (!current) {
    throw new Error("RKC is not installed for the resolved user home.");
  }
  await validateInstalledVersion(current.version_path, current.active_version);
  return {
    user_home: userHome,
    rkc_root: rkcRoot,
    active_version: current.active_version,
    version_path: current.version_path,
  };
}

export async function selfUpdate(
  options: InstallOptions = {},
): Promise<SelfUpdateResult> {
  const installed = await install(options);
  const retention = await pruneInstalledVersions(
    installed.rkc_root,
    installed.active_version,
  );
  return {
    ...installed,
    removed_versions: retention.removed,
    retained_versions: retention.retained,
  };
}

export async function uninstall(
  options: UninstallOptions = {},
): Promise<UninstallResult> {
  const userHome = await resolveUserHome(options.testUserHome);
  if (
    options.testRemoveTarget !== undefined &&
    options.testUserHome === undefined
  ) {
    throw new Error(
      "The uninstall failure adapter is available only in a marked test home.",
    );
  }
  const targets = resolveUninstallTargets(userHome);
  for (const target of targets) validateUninstallTarget(userHome, target);

  const preview: UninstallTargetResult[] = [];
  for (const target of targets) {
    const exists = await pathEntryExists(target);
    const preserved =
      exists &&
      isClaudeSkillTarget(userHome, target) &&
      !(await isManagedClaudeSkillLink(userHome, target));
    preview.push({
      path: target,
      status: preserved ? "preserved" : exists ? "present" : "absent",
    });
  }
  if (options.dryRun || !options.confirmed) {
    return {
      confirmed: options.confirmed === true,
      dry_run: options.dryRun === true,
      success: options.dryRun === true,
      targets: preview,
    };
  }

  const removeTarget =
    options.testRemoveTarget ??
    (async (path: string) => rm(path, { force: true, recursive: true }));
  const results: UninstallTargetResult[] = [];
  for (const target of targets) {
    if (!(await pathEntryExists(target))) {
      results.push({ path: target, status: "absent" });
      continue;
    }
    if (
      isClaudeSkillTarget(userHome, target) &&
      !(await isManagedClaudeSkillLink(userHome, target))
    ) {
      results.push({ path: target, status: "preserved" });
      continue;
    }
    try {
      await removeTarget(target);
      results.push({ path: target, status: "removed" });
    } catch (error) {
      results.push({
        path: target,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return {
    confirmed: true,
    dry_run: false,
    success: results.every((entry) => entry.status !== "failed"),
    targets: results,
  };
}

function resolveUninstallTargets(userHome: string): string[] {
  return [
    join(userHome, ".rkc"),
    ...skillNames.map((name) => join(userHome, ".agents", "skills", name)),
    ...skillNames.map((name) => join(userHome, ".claude", "skills", name)),
  ].map((path) => resolve(path));
}

function isClaudeSkillTarget(userHome: string, target: string): boolean {
  const claudeSkillsRoot = resolve(userHome, ".claude", "skills");
  return (
    dirname(target) === claudeSkillsRoot &&
    skillNames.some((name) => name === basename(target))
  );
}

function validateUninstallTarget(userHome: string, target: string): void {
  const resolvedHome = resolve(userHome);
  const approved = new Set(resolveUninstallTargets(resolvedHome));
  const root = parse(target).root;
  const child = relative(resolvedHome, target);
  if (
    !isAbsolute(target) ||
    target === root ||
    target === resolvedHome ||
    child === "" ||
    child.startsWith("..") ||
    isAbsolute(child) ||
    !approved.has(target)
  ) {
    throw new Error(`Refusing unsafe uninstall target: ${target}`);
  }
}

async function resolveUserHome(testUserHome?: string): Promise<string> {
  if (testUserHome === undefined) return resolve(homedir());
  if (!isAbsolute(testUserHome)) {
    throw new Error(`${TEST_USER_HOME_VARIABLE} must be an absolute path.`);
  }

  const resolvedHome = resolve(testUserHome);
  const canonicalHome = await realpath(resolvedHome);
  const canonicalRealHome = await realpath(resolve(homedir()));
  const root = parse(canonicalHome).root;
  if (
    pathsEqual(canonicalHome, root) ||
    pathsEqual(canonicalHome, canonicalRealHome)
  ) {
    throw new Error(
      "The test user home must not be a filesystem root or real user home.",
    );
  }
  if (
    basename(resolvedHome).toLowerCase() !== "user-home" ||
    basename(canonicalHome).toLowerCase() !== "user-home"
  ) {
    throw new Error(
      "The test user home must be the user-home child of one test root.",
    );
  }

  const testRoot = dirname(resolvedHome);
  const canonicalTestRoot = await realpath(testRoot);
  const marker = await readJson(join(testRoot, TEST_ROOT_MARKER));
  const markerRoot =
    typeof marker === "object" && marker !== null && "root" in marker
      ? await canonicalizeExistingPath(String(marker.root))
      : undefined;
  if (
    markerRoot === undefined ||
    !pathsEqual(markerRoot, canonicalTestRoot) ||
    !pathsEqual(dirname(canonicalHome), canonicalTestRoot)
  ) {
    throw new Error("The test root marker does not authorize this user home.");
  }

  const child = relative(canonicalTestRoot, canonicalHome);
  if (child === "" || child.startsWith("..") || isAbsolute(child)) {
    throw new Error(
      "The test user home must remain beneath its marked test root.",
    );
  }
  return canonicalHome;
}

async function canonicalizeExistingPath(
  candidate: string,
): Promise<string | undefined> {
  try {
    return await realpath(resolve(candidate));
  } catch {
    return undefined;
  }
}

function pathsEqual(left: string, right: string): boolean {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function normalizeWindowsLinkPath(path: string): string {
  if (process.platform !== "win32") return path;
  if (path.startsWith("\\\\?\\UNC\\")) return `\\\\${path.slice(8)}`;
  if (path.startsWith("\\\\?\\") || path.startsWith("\\??\\")) {
    return path.slice(4);
  }
  return path;
}

async function readPayloadManifest(
  payloadRoot: string,
  expectedVersion: string,
): Promise<PayloadManifest> {
  const value = await readJson(join(payloadRoot, "payload-manifest.json"));
  if (
    typeof value !== "object" ||
    value === null ||
    value.format_version !== 1 ||
    value.package_name !== BOOTSTRAP_PACKAGE_NAME ||
    value.version !== expectedVersion ||
    typeof value.core_package !== "string" ||
    value.host_boundary_entry !==
      `node_modules/${BOOTSTRAP_PACKAGE_NAME}/dist/maintenance.js` ||
    value.self_description_manifest !== "self-description-manifest.json" ||
    value.documentation_master_prompt !==
      "documentation/RKC-Documentation-Master-Prompt.md" ||
    typeof value.documentation_prompt_version !== "string" ||
    !/^RKC-DOCS-CREATE-\d+\.\d+$/u.test(value.documentation_prompt_version) ||
    !Array.isArray(value.skills) ||
    value.skills.join("\n") !== skillNames.join("\n")
  ) {
    throw new Error(
      "The bootstrap payload manifest is missing or incompatible.",
    );
  }
  return {
    format_version: 1,
    package_name: BOOTSTRAP_PACKAGE_NAME,
    version: expectedVersion,
    core_package: value.core_package,
    host_boundary_entry: value.host_boundary_entry,
    self_description_manifest: value.self_description_manifest,
    documentation_master_prompt: value.documentation_master_prompt,
    documentation_prompt_version: value.documentation_prompt_version,
    skills: [...skillNames],
  };
}

async function recordSuccessfulActivation(
  rkcRoot: string,
  version: string,
  activatedAt: string,
): Promise<void> {
  const historyPath = join(rkcRoot, "activation-history.json");
  const history = await readActivationHistory(historyPath);
  const activations = [
    { activated_at: activatedAt, version },
    ...history.activations.filter((entry) => entry.version !== version),
  ];
  await writeJsonAtomic(historyPath, {
    format_version: 1,
    activations,
  } satisfies ActivationHistory);
}

async function pruneInstalledVersions(
  rkcRoot: string,
  activeVersion: string,
): Promise<{ removed: string[]; retained: string[] }> {
  const historyPath = join(rkcRoot, "activation-history.json");
  const history = await readActivationHistory(historyPath);
  if (history.activations[0]?.version !== activeVersion) {
    throw new Error(
      "Activation history does not identify the active RKC version.",
    );
  }
  const retained = history.activations
    .slice(0, 3)
    .map((entry) => entry.version);
  const retainedSet = new Set(retained);
  const versionsRoot = join(rkcRoot, "versions");
  const removed: string[] = [];
  for (const entry of await readdir(versionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || retainedSet.has(entry.name)) continue;
    validateVersionPathSegment(entry.name);
    const target = resolve(versionsRoot, entry.name);
    if (dirname(target) !== resolve(versionsRoot)) {
      throw new Error(`Refusing unsafe installed-version target: ${target}`);
    }
    await rm(target, { force: true, recursive: true });
    removed.push(entry.name);
  }
  await writeJsonAtomic(historyPath, {
    format_version: 1,
    activations: history.activations.filter((entry) =>
      retainedSet.has(entry.version),
    ),
  } satisfies ActivationHistory);
  return { removed: removed.sort(), retained };
}

async function readActivationHistory(path: string): Promise<ActivationHistory> {
  let value: Record<string, unknown>;
  try {
    value = await readJson(path);
  } catch (error) {
    if (isMissingFileError(error)) {
      return { format_version: 1, activations: [] };
    }
    throw error;
  }
  if (value.format_version !== 1 || !Array.isArray(value.activations)) {
    throw new Error("RKC activation history is incompatible.");
  }
  const rawActivations: unknown[] = value.activations;
  const activations = rawActivations.map((entry) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("RKC activation history entry is invalid.");
    }
    const record = entry as Record<string, unknown>;
    if (
      typeof record.version !== "string" ||
      typeof record.activated_at !== "string"
    ) {
      throw new Error("RKC activation history entry is invalid.");
    }
    validateVersionPathSegment(record.version);
    return { activated_at: record.activated_at, version: record.version };
  });
  if (
    new Set(activations.map((entry) => entry.version)).size !==
    activations.length
  ) {
    throw new Error("RKC activation history contains duplicate versions.");
  }
  return { format_version: 1, activations };
}

function validateVersionPathSegment(version: string): void {
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(
      version,
    ) ||
    basename(version) !== version
  ) {
    throw new Error(`Unsafe RKC version path segment: ${version}`);
  }
}

async function installVersion(
  payloadRoot: string,
  versionPath: string,
  rkcRoot: string,
  manifest: PayloadManifest,
  now: Date,
): Promise<void> {
  const stagingPath = join(
    rkcRoot,
    ".staging",
    `${manifest.version}-${randomUUID()}`,
  );
  try {
    await mkdir(stagingPath, { recursive: false });
    await cp(
      join(payloadRoot, "node_modules"),
      join(stagingPath, "node_modules"),
      { recursive: true },
    );
    await copyFile(
      join(payloadRoot, manifest.self_description_manifest),
      join(stagingPath, manifest.self_description_manifest),
    );
    const promptTarget = join(
      stagingPath,
      manifest.documentation_master_prompt,
    );
    await mkdir(dirname(promptTarget), { recursive: true });
    await copyFile(
      join(payloadRoot, manifest.documentation_master_prompt),
      promptTarget,
    );
    await writeJsonAtomic(join(stagingPath, "core-manifest.json"), {
      format_version: 1,
      package_name: BOOTSTRAP_PACKAGE_NAME,
      version: manifest.version,
      installed_at: now.toISOString(),
      core_package: manifest.core_package,
      host_boundary_entry: manifest.host_boundary_entry,
      self_description_manifest: manifest.self_description_manifest,
      documentation_master_prompt: manifest.documentation_master_prompt,
      documentation_prompt_version: manifest.documentation_prompt_version,
    });
    await renameWithRetry(stagingPath, versionPath);
  } catch (error) {
    await rm(stagingPath, { force: true, recursive: true });
    throw error;
  }
}

async function activateInstallation(
  userHome: string,
  rkcRoot: string,
  payloadRoot: string,
  versionPath: string,
  manifest: PayloadManifest,
  activatedAt: string,
  testInterruptionAfterSkill?: number,
  testPauseAfterPreparedFile?: string,
): Promise<void> {
  const skillsRoot = join(userHome, ".agents", "skills");
  const claudeSkillsRoot = join(userHome, ".claude", "skills");
  const transactionId = randomUUID();
  const stagingRoot = join(skillsRoot, `.rkc-staging-${transactionId}`);
  const backupRoot = join(skillsRoot, `.rkc-backup-${transactionId}`);
  const claudeStagingRoot = join(
    claudeSkillsRoot,
    `.rkc-staging-${transactionId}`,
  );
  const claudeBackupRoot = join(
    claudeSkillsRoot,
    `.rkc-backup-${transactionId}`,
  );
  const transactionPath = join(rkcRoot, "install-transaction.json");
  const currentPath = join(rkcRoot, "current.json");
  const currentBackupPath = join(backupRoot, "current.json");
  const skillEntries: Array<{ had_previous: boolean; name: string }> = [];
  const claudeLinkEntries: Array<{ had_previous: boolean; name: string }> = [];
  await mkdir(stagingRoot, { recursive: true });
  await mkdir(backupRoot, { recursive: true });
  await mkdir(claudeStagingRoot, { recursive: true });
  await mkdir(claudeBackupRoot, { recursive: true });
  try {
    for (const name of skillNames) {
      const stagedSkill = join(stagingRoot, name);
      await cp(join(payloadRoot, "skills", name), stagedSkill, {
        recursive: true,
      });
      await writeJsonAtomic(join(stagedSkill, "installation.json"), {
        format_version: 1,
        package_name: BOOTSTRAP_PACKAGE_NAME,
        skill: name,
        core_version: manifest.version,
        core_path: versionPath,
        activated_at: activatedAt,
        activation_id: transactionId,
      });
      skillEntries.push({
        had_previous: await pathExists(join(skillsRoot, name)),
        name,
      });

      const claudeTarget = join(claudeSkillsRoot, name);
      const claudeTargetExists = await pathEntryExists(claudeTarget);
      if (
        claudeTargetExists &&
        !(await isManagedClaudeSkillLink(userHome, claudeTarget))
      ) {
        throw new Error(
          `Refusing to replace unmanaged Claude Code skill: ${claudeTarget}`,
        );
      }
      await symlink(
        join(skillsRoot, name),
        join(claudeStagingRoot, name),
        process.platform === "win32" ? "junction" : "dir",
      );
      claudeLinkEntries.push({
        had_previous: claudeTargetExists,
        name,
      });
    }

    const hadCurrent = await pathExists(currentPath);
    if (hadCurrent) await copyFile(currentPath, currentBackupPath);

    const transaction: InstallTransaction = {
      format_version: 1,
      transaction_id: transactionId,
      phase: "prepared",
      staging_root: stagingRoot,
      backup_root: backupRoot,
      had_current: hadCurrent,
      skills: skillEntries,
      claude_staging_root: claudeStagingRoot,
      claude_backup_root: claudeBackupRoot,
      claude_links: claudeLinkEntries,
    };
    await writeJsonAtomic(transactionPath, transaction);
    if (testPauseAfterPreparedFile !== undefined) {
      const resolvedReadyFile = resolve(testPauseAfterPreparedFile);
      const readyFile = join(
        await realpath(dirname(resolvedReadyFile)),
        basename(resolvedReadyFile),
      );
      const testRoot = dirname(userHome);
      const relation = relative(testRoot, readyFile);
      if (
        !isAbsolute(testPauseAfterPreparedFile) ||
        relation === "" ||
        relation === ".." ||
        relation.startsWith(`..${sep}`) ||
        isAbsolute(relation)
      ) {
        throw new Error(
          "Prepared-transaction marker must stay in the test root.",
        );
      }
      await writeFile(readyFile, "prepared\n", {
        encoding: "utf8",
        flag: "wx",
      });
      await new Promise<never>(() => {
        setInterval(() => undefined, 1_000);
      });
    }

    for (const [index, entry] of skillEntries.entries()) {
      const target = join(skillsRoot, entry.name);
      const backup = join(backupRoot, entry.name);
      if (entry.had_previous) await renameWithRetry(target, backup);
      await renameWithRetry(join(stagingRoot, entry.name), target);
      if (testInterruptionAfterSkill === index + 1) {
        throw new SimulatedInterruptionError();
      }
    }

    for (const [index, entry] of claudeLinkEntries.entries()) {
      const target = join(claudeSkillsRoot, entry.name);
      const backup = join(claudeBackupRoot, entry.name);
      if (entry.had_previous) await renameWithRetry(target, backup);
      await renameWithRetry(join(claudeStagingRoot, entry.name), target);
      if (testInterruptionAfterSkill === skillEntries.length + index + 1) {
        throw new SimulatedInterruptionError();
      }
    }

    await writeJsonAtomic(currentPath, {
      format_version: 1,
      package_name: BOOTSTRAP_PACKAGE_NAME,
      active_version: manifest.version,
      version_path: versionPath,
      activated_at: activatedAt,
      activation_id: transactionId,
    } satisfies CurrentInstallation);

    await writeJsonAtomic(transactionPath, {
      ...transaction,
      phase: "committed",
    } satisfies InstallTransaction);
    await cleanupInstallTransaction(transactionPath, transaction);
  } catch (error) {
    if (!(await pathExists(transactionPath))) {
      await rm(stagingRoot, { force: true, recursive: true });
      await rm(backupRoot, { force: true, recursive: true });
      await rm(claudeStagingRoot, { force: true, recursive: true });
      await rm(claudeBackupRoot, { force: true, recursive: true });
    }
    throw error;
  }
}

async function recoverPendingActivation(
  userHome: string,
  rkcRoot: string,
): Promise<void> {
  const transactionPath = join(rkcRoot, "install-transaction.json");
  let transaction: InstallTransaction;
  try {
    transaction = await readInstallTransaction(transactionPath, userHome);
  } catch (error) {
    if (isMissingFileError(error)) return;
    throw error;
  }

  if (transaction.phase === "committed") {
    await cleanupInstallTransaction(transactionPath, transaction);
    return;
  }

  const skillsRoot = join(userHome, ".agents", "skills");
  const claudeSkillsRoot = join(userHome, ".claude", "skills");
  for (const entry of [...(transaction.claude_links ?? [])].reverse()) {
    const target = join(claudeSkillsRoot, entry.name);
    const backup = join(String(transaction.claude_backup_root), entry.name);
    if (await pathEntryExists(backup)) {
      await rm(target, { force: true, recursive: true });
      await renameWithRetry(backup, target);
      continue;
    }
    if (
      !entry.had_previous &&
      (await isManagedClaudeSkillLink(userHome, target))
    ) {
      await rm(target, { force: true, recursive: true });
    }
  }
  for (const entry of [...transaction.skills].reverse()) {
    const target = join(skillsRoot, entry.name);
    const backup = join(transaction.backup_root, entry.name);
    if (await pathExists(backup)) {
      await rm(target, { force: true, recursive: true });
      await renameWithRetry(backup, target);
      continue;
    }
    const activationId = await readSkillActivationId(target);
    if (!entry.had_previous && activationId === transaction.transaction_id) {
      await rm(target, { force: true, recursive: true });
    }
  }

  const currentPath = join(rkcRoot, "current.json");
  const currentBackupPath = join(transaction.backup_root, "current.json");
  if (transaction.had_current && (await pathExists(currentBackupPath))) {
    await copyFile(currentBackupPath, currentPath);
  } else {
    const current = await readCurrentInstallation(rkcRoot);
    if (current?.activation_id === transaction.transaction_id) {
      await rm(currentPath, { force: true });
    }
  }
  await cleanupInstallTransaction(transactionPath, transaction);
}

async function cleanupInstallTransaction(
  transactionPath: string,
  transaction: InstallTransaction,
): Promise<void> {
  await rm(transaction.staging_root, { force: true, recursive: true });
  await rm(transaction.backup_root, { force: true, recursive: true });
  if (transaction.claude_staging_root !== undefined) {
    await rm(transaction.claude_staging_root, {
      force: true,
      recursive: true,
    });
  }
  if (transaction.claude_backup_root !== undefined) {
    await rm(transaction.claude_backup_root, {
      force: true,
      recursive: true,
    });
  }
  await rm(transactionPath, { force: true });
}

async function readInstallTransaction(
  transactionPath: string,
  userHome: string,
): Promise<InstallTransaction> {
  const value = await readJson(transactionPath);
  const transactionId = value.transaction_id;
  const skillsRoot = join(userHome, ".agents", "skills");
  const claudeSkillsRoot = join(userHome, ".claude", "skills");
  if (
    value.format_version !== 1 ||
    typeof transactionId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      transactionId,
    ) ||
    (value.phase !== "prepared" && value.phase !== "committed") ||
    value.staging_root !== join(skillsRoot, `.rkc-staging-${transactionId}`) ||
    value.backup_root !== join(skillsRoot, `.rkc-backup-${transactionId}`) ||
    typeof value.had_current !== "boolean" ||
    !Array.isArray(value.skills) ||
    value.retired_skills !== undefined ||
    value.retired_claude_links !== undefined
  ) {
    throw new Error("RKC install transaction metadata is incompatible.");
  }

  const skills = readTransactionSkillEntries(value.skills, "skill");
  const hasClaudeMetadata =
    value.claude_staging_root !== undefined ||
    value.claude_backup_root !== undefined ||
    value.claude_links !== undefined;
  let claudeLinks: Array<{ had_previous: boolean; name: string }> | undefined;
  if (hasClaudeMetadata) {
    if (
      value.claude_staging_root !==
        join(claudeSkillsRoot, `.rkc-staging-${transactionId}`) ||
      value.claude_backup_root !==
        join(claudeSkillsRoot, `.rkc-backup-${transactionId}`) ||
      !Array.isArray(value.claude_links)
    ) {
      throw new Error(
        "RKC install transaction contains invalid Claude Code links.",
      );
    }
    claudeLinks = readTransactionSkillEntries(
      value.claude_links,
      "Claude Code link",
    );
  }

  return {
    format_version: 1,
    transaction_id: transactionId,
    phase: value.phase,
    staging_root: value.staging_root,
    backup_root: value.backup_root,
    had_current: value.had_current,
    skills,
    ...(claudeLinks === undefined
      ? {}
      : {
          claude_staging_root: String(value.claude_staging_root),
          claude_backup_root: String(value.claude_backup_root),
          claude_links: claudeLinks,
        }),
  };
}

function readTransactionSkillEntries(
  value: unknown,
  label: string,
): Array<{ had_previous: boolean; name: string }> {
  if (!Array.isArray(value)) {
    throw new Error(`RKC install transaction has an invalid ${label} set.`);
  }
  const rawEntries: unknown[] = value;
  const entries = rawEntries.map((entry) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("name" in entry) ||
      !("had_previous" in entry) ||
      !skillNames.some((name) => name === entry.name) ||
      typeof entry.had_previous !== "boolean"
    ) {
      throw new Error(`RKC install transaction contains an invalid ${label}.`);
    }
    return { had_previous: entry.had_previous, name: String(entry.name) };
  });
  const names = entries.map((entry) => entry.name).join("\n");
  if (names !== skillNames.join("\n")) {
    throw new Error(`RKC install transaction has an incomplete ${label} set.`);
  }
  return entries;
}

async function isManagedClaudeSkillLink(
  userHome: string,
  path: string,
): Promise<boolean> {
  try {
    const information = await lstat(path);
    if (!information.isSymbolicLink()) return false;
    const destination = normalizeWindowsLinkPath(await readlink(path));
    const expected = join(userHome, ".agents", "skills", basename(path));
    return pathsEqual(resolve(dirname(path), destination), expected);
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

async function readSkillActivationId(
  path: string,
): Promise<string | undefined> {
  try {
    const metadata = await readJson(join(path, "installation.json"));
    return typeof metadata.activation_id === "string"
      ? metadata.activation_id
      : undefined;
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

class SimulatedInterruptionError extends Error {
  constructor() {
    super("Simulated installer interruption.");
    this.name = "SimulatedInterruptionError";
  }
}

async function validateInstalledVersion(
  versionPath: string,
  expectedVersion: string,
): Promise<void> {
  const manifest = await readJson(join(versionPath, "core-manifest.json"));
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    manifest.package_name !== BOOTSTRAP_PACKAGE_NAME ||
    manifest.version !== expectedVersion ||
    manifest.documentation_master_prompt !==
      "documentation/RKC-Documentation-Master-Prompt.md" ||
    typeof manifest.documentation_prompt_version !== "string" ||
    !/^RKC-DOCS-CREATE-\d+\.\d+$/u.test(manifest.documentation_prompt_version)
  ) {
    throw new Error(
      `Installed RKC version ${expectedVersion} is incompatible.`,
    );
  }
  await readFile(
    join(versionPath, String(manifest.documentation_master_prompt)),
    "utf8",
  );
  const selfDescription = await readJson(
    join(versionPath, "self-description-manifest.json"),
  );
  if (
    typeof selfDescription !== "object" ||
    selfDescription === null ||
    selfDescription.format_version !== 1 ||
    selfDescription.distribution_version !== expectedVersion ||
    selfDescription.provider_specific_instruction_files !== false ||
    !Array.isArray(selfDescription.skills) ||
    selfDescription.skills.join("\n") !== skillNames.join("\n")
  ) {
    throw new Error(
      `Installed RKC self-description ${expectedVersion} is incompatible.`,
    );
  }
}

async function readCurrentInstallation(
  rkcRoot: string,
): Promise<CurrentInstallation | undefined> {
  try {
    const value = await readJson(join(rkcRoot, "current.json"));
    if (
      typeof value !== "object" ||
      value === null ||
      value.format_version !== 1 ||
      value.package_name !== BOOTSTRAP_PACKAGE_NAME ||
      typeof value.active_version !== "string" ||
      typeof value.version_path !== "string" ||
      typeof value.activated_at !== "string" ||
      (value.activation_id !== undefined &&
        typeof value.activation_id !== "string")
    ) {
      throw new Error("RKC current installation metadata is incompatible.");
    }
    return {
      format_version: 1,
      package_name: BOOTSTRAP_PACKAGE_NAME,
      active_version: value.active_version,
      version_path: value.version_path,
      activated_at: value.activated_at,
      ...(typeof value.activation_id === "string"
        ? { activation_id: value.activation_id }
        : {}),
    };
  } catch (error) {
    if (isMissingFileError(error)) return undefined;
    throw error;
  }
}

const transientRenameErrorCodes = new Set(["EACCES", "EBUSY", "EPERM"]);
const renameRetryDelaysMs = [25, 50, 100, 200, 400, 800] as const;

interface RenameWithRetryOptions {
  readonly delays?: readonly number[];
  readonly operation?: (source: string, destination: string) => Promise<void>;
  readonly wait?: (milliseconds: number) => Promise<void>;
}

export async function renameWithRetry(
  source: string,
  destination: string,
  options: RenameWithRetryOptions = {},
): Promise<void> {
  const delays = options.delays ?? renameRetryDelaysMs;
  const operation = options.operation ?? rename;
  const waitForRetry = options.wait ?? wait;

  for (let attempt = 0; ; attempt += 1) {
    try {
      await operation(source, destination);
      return;
    } catch (error) {
      const delay = delays[attempt];
      if (delay === undefined || !isTransientRenameError(error)) throw error;
      await waitForRetry(delay);
    }
  }
}

function isTransientRenameError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    transientRenameErrorCodes.has(String(error.code))
  );
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await renameWithRetry(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

async function pathEntryExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) return false;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
