import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./identity.js";
import { help } from "./help.js";
import {
  install,
  installedVersion,
  renameWithRetry,
  selfUpdate,
  TEST_ROOT_MARKER,
  TEST_USER_HOME_VARIABLE,
  uninstall,
} from "./lifecycle.js";
import { doctor, runPostOperationUpdateDiscovery } from "./maintenance.js";

const execFileAsync = promisify(execFile);
const skillNames = [
  "rkc-help",
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
] as const;

void test("retries transient rename failures with bounded backoff", async () => {
  const observedDelays: number[] = [];
  let attempts = 0;

  await renameWithRetry("source", "destination", {
    delays: [10, 20, 40],
    operation: () => {
      attempts += 1;
      return attempts < 3
        ? Promise.reject(
            Object.assign(new Error("temporarily locked"), {
              code: attempts === 1 ? "EPERM" : "EBUSY",
            }),
          )
        : Promise.resolve();
    },
    wait: (milliseconds) => {
      observedDelays.push(milliseconds);
      return Promise.resolve();
    },
  });

  assert.equal(attempts, 3);
  assert.deepEqual(observedDelays, [10, 20]);
});

void test("does not hide permanent or exhausted rename failures", async () => {
  let permanentAttempts = 0;
  let permanentWaits = 0;
  await assert.rejects(
    renameWithRetry("source", "destination", {
      operation: () => {
        permanentAttempts += 1;
        return Promise.reject(
          Object.assign(new Error("missing source"), { code: "ENOENT" }),
        );
      },
      wait: () => {
        permanentWaits += 1;
        return Promise.resolve();
      },
    }),
    /missing source/u,
  );
  assert.equal(permanentAttempts, 1);
  assert.equal(permanentWaits, 0);

  const observedDelays: number[] = [];
  let transientAttempts = 0;
  await assert.rejects(
    renameWithRetry("source", "destination", {
      delays: [10, 20],
      operation: () => {
        transientAttempts += 1;
        return Promise.reject(
          Object.assign(new Error("still locked"), { code: "EPERM" }),
        );
      },
      wait: (milliseconds) => {
        observedDelays.push(milliseconds);
        return Promise.resolve();
      },
    }),
    /still locked/u,
  );
  assert.equal(transientAttempts, 3);
  assert.deepEqual(observedDelays, [10, 20]);
});

void test("installs one versioned core and four thin skills without repository writes", async (context) => {
  const environment = await createTestEnvironment(context);
  const repositorySentinel = join(
    environment.root,
    "repositories",
    "repository-a",
    "sentinel.txt",
  );
  await mkdir(dirname(repositorySentinel), { recursive: true });
  await writeFile(repositorySentinel, "unchanged\n", "utf8");

  const installed = await install({
    now: new Date("2026-08-17T08:00:00.000Z"),
    testUserHome: environment.userHome,
  });

  assert.equal(installed.active_version, FOUNDATION_VERSION);
  assert.equal(installed.repeated, false);
  assert.equal(await readFile(repositorySentinel, "utf8"), "unchanged\n");

  const current = await readJson(
    join(environment.userHome, ".rkc", "current.json"),
  );
  assert.equal(current.active_version, FOUNDATION_VERSION);
  assert.equal(current.version_path, installed.version_path);
  assert.equal(current.activated_at, "2026-08-17T08:00:00.000Z");

  const coreManifest = await readJson(
    join(installed.version_path, "core-manifest.json"),
  );
  assert.equal(coreManifest.version, FOUNDATION_VERSION);
  assert.equal(
    coreManifest.documentation_master_prompt,
    "documentation/RKC-Documentation-Master-Prompt.md",
  );
  assert.equal(
    coreManifest.documentation_prompt_version,
    "RKC-DOCS-CREATE-2.14",
  );
  await readFile(
    join(installed.version_path, coreManifest.documentation_master_prompt),
    "utf8",
  );
  assert.equal(
    coreManifest.host_boundary_entry,
    `node_modules/${BOOTSTRAP_PACKAGE_NAME}/dist/maintenance.js`,
  );
  await readFile(
    join(
      installed.version_path,
      "node_modules",
      "@rkc",
      "core",
      "dist",
      "index.js",
    ),
    "utf8",
  );
  await readFile(
    join(installed.version_path, coreManifest.host_boundary_entry),
    "utf8",
  );
  for (const skill of skillNames) {
    await readFile(
      join(environment.userHome, ".agents", "skills", skill, "SKILL.md"),
      "utf8",
    );
    const metadata = await readJson(
      join(
        environment.userHome,
        ".agents",
        "skills",
        skill,
        "installation.json",
      ),
    );
    assert.equal(metadata.skill, skill);
    assert.equal(metadata.core_version, FOUNDATION_VERSION);
    assert.equal(metadata.core_path, installed.version_path);

    const claudeSkill = join(environment.userHome, ".claude", "skills", skill);
    assert.equal((await lstat(claudeSkill)).isSymbolicLink(), true);
    assert.equal(
      await realpath(
        resolve(dirname(claudeSkill), await readlink(claudeSkill)),
      ),
      await realpath(join(environment.userHome, ".agents", "skills", skill)),
    );
    assert.equal(
      await readFile(join(claudeSkill, "SKILL.md"), "utf8"),
      await readFile(
        join(environment.userHome, ".agents", "skills", skill, "SKILL.md"),
        "utf8",
      ),
    );
  }

  const repeated = await install({
    now: new Date("2026-08-18T08:00:00.000Z"),
    testUserHome: environment.userHome,
  });
  assert.equal(repeated.repeated, true);
  const repeatedCurrent = await readJson(
    join(environment.userHome, ".rkc", "current.json"),
  );
  assert.equal(repeatedCurrent.active_version, FOUNDATION_VERSION);
  assert.equal(repeatedCurrent.version_path, installed.version_path);
  assert.equal(repeatedCurrent.activated_at, "2026-08-17T08:00:00.000Z");
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );
});

void test("CLI install and version share the validated test-home seam", async (context) => {
  const environment = await createTestEnvironment(context);
  const cli = join(dirname(fileURLToPath(import.meta.url)), "cli.js");
  const processEnvironment = {
    ...process.env,
    [TEST_USER_HOME_VARIABLE]: environment.userHome,
  };

  const installation = await execFileAsync(process.execPath, [cli, "install"], {
    env: processEnvironment,
  });
  assert.match(
    installation.stdout,
    new RegExp(`RKC ${escapeRegExp(FOUNDATION_VERSION)} installed\\.`, "u"),
  );
  assert.match(installation.stdout, /rkc-help/u);

  const version = await execFileAsync(process.execPath, [cli, "version"], {
    env: processEnvironment,
  });
  assert.equal(version.stdout, `${FOUNDATION_VERSION}\n`);
  assert.equal(version.stderr, "");

  const cachedDoctor = await execFileAsync(process.execPath, [cli, "doctor"], {
    env: processEnvironment,
  });
  assert.match(cachedDoctor.stdout, /Update status: UNKNOWN/u);
  const disabledDoctor = await execFileAsync(
    process.execPath,
    [cli, "doctor", "--disable-update-checks"],
    { env: processEnvironment },
  );
  assert.match(disabledDoctor.stdout, /Automatic checks: disabled/u);

  const updated = await execFileAsync(process.execPath, [cli, "self-update"], {
    env: processEnvironment,
  });
  assert.match(updated.stdout, /is active after explicit self-update/u);
  assert.match(
    updated.stdout,
    new RegExp(`Retained: ${escapeRegExp(FOUNDATION_VERSION)}`, "u"),
  );
});

void test("rejects unresolved, broad, and unmarked test homes", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "rkc-stage10-invalid-"));
  context.after(async () => rm(root, { force: true, recursive: true }));

  await assert.rejects(
    install({ testUserHome: "relative/user-home" }),
    /absolute path/u,
  );
  await assert.rejects(install({ testUserHome: root }), /user-home child/u);
  await assert.rejects(
    install({ testUserHome: join(root, "user-home") }),
    /ENOENT/u,
  );
});

void test("contains the prepared-transaction pause inside its marked test root", async (context) => {
  const environment = await createTestEnvironment(context);
  await assert.rejects(
    install({
      testPauseAfterPreparedFile: join(environment.root, "..", "escaped.ready"),
      testUserHome: environment.userHome,
    }),
    /must stay in the test root/u,
  );
  await assert.rejects(
    readFile(
      join(environment.userHome, ".rkc", "install-transaction.json"),
      "utf8",
    ),
    /ENOENT/u,
  );
  await assert.rejects(
    install({
      testInterruptionAfterSkill: 1,
      testPauseAfterPreparedFile: join(environment.root, "prepared.ready"),
      testUserHome: environment.userHome,
    }),
    /cannot be combined/u,
  );
});

void test(
  "accepts Windows marker paths independent of path-letter casing",
  { skip: process.platform !== "win32" },
  async (context) => {
    const environment = await createTestEnvironment(context);
    await writeFile(
      join(environment.root, TEST_ROOT_MARKER),
      `${JSON.stringify({ root: environment.root.toUpperCase() }, null, 2)}\n`,
      "utf8",
    );
    const installed = await install({ testUserHome: environment.userHome });
    assert.equal(installed.active_version, FOUNDATION_VERSION);
  },
);

void test("recovers a prepared activation transaction before repeating install", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const currentPath = join(environment.userHome, ".rkc", "current.json");
  const previousCurrent = await readFile(currentPath, "utf8");

  await assert.rejects(
    install({
      testInterruptionAfterSkill: 7,
      testUserHome: environment.userHome,
    }),
    /Simulated installer interruption/u,
  );
  assert.equal(await readFile(currentPath, "utf8"), previousCurrent);
  await readFile(
    join(environment.userHome, ".rkc", "install-transaction.json"),
    "utf8",
  );

  const recovered = await install({ testUserHome: environment.userHome });
  assert.equal(recovered.repeated, true);
  await assert.rejects(
    readFile(
      join(environment.userHome, ".rkc", "install-transaction.json"),
      "utf8",
    ),
    /ENOENT/u,
  );
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );
  for (const skill of skillNames) {
    const metadata = await readJson(
      join(
        environment.userHome,
        ".agents",
        "skills",
        skill,
        "installation.json",
      ),
    );
    assert.equal(metadata.core_version, FOUNDATION_VERSION);
    const claudeSkill = join(environment.userHome, ".claude", "skills", skill);
    assert.equal((await lstat(claudeSkill)).isSymbolicLink(), true);
    await readFile(join(claudeSkill, "SKILL.md"), "utf8");
  }
});

void test("refuses an unmanaged Claude Code skill collision without replacing it", async (context) => {
  const environment = await createTestEnvironment(context);
  const collision = join(
    environment.userHome,
    ".claude",
    "skills",
    "rkc-create-docs",
  );
  await mkdir(collision, { recursive: true });
  await writeFile(join(collision, "SKILL.md"), "# User-owned skill\n", "utf8");

  await assert.rejects(
    install({ testUserHome: environment.userHome }),
    /Refusing to replace unmanaged Claude Code skill/u,
  );
  assert.equal(
    await readFile(join(collision, "SKILL.md"), "utf8"),
    "# User-owned skill\n",
  );
  await assert.rejects(
    readFile(
      join(
        environment.userHome,
        ".agents",
        "skills",
        "rkc-create-docs",
        "SKILL.md",
      ),
      "utf8",
    ),
    /ENOENT/u,
  );
});

void test("dry-run and unconfirmed uninstall preserve managed and project files", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const repositorySentinel = join(
    environment.root,
    "repositories",
    "repository-a",
    ".rkc",
    "project.json",
  );
  await mkdir(dirname(repositorySentinel), { recursive: true });
  await writeFile(repositorySentinel, '{"preserved":true}\n', "utf8");

  const dryRun = await uninstall({
    dryRun: true,
    testUserHome: environment.userHome,
  });
  assert.equal(dryRun.success, true);
  assert.equal(dryRun.targets.length, 9);
  assert.equal(
    dryRun.targets.filter((target) => target.status === "present").length,
    9,
  );
  assert.equal(
    dryRun.targets.filter((target) => target.status === "absent").length,
    0,
  );
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );

  const unconfirmed = await uninstall({
    testUserHome: environment.userHome,
  });
  assert.equal(unconfirmed.success, false);
  assert.equal(unconfirmed.confirmed, false);
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );
  assert.equal(
    await readFile(repositorySentinel, "utf8"),
    '{"preserved":true}\n',
  );
});

void test("confirmed uninstall removes the complete core and modified skills but preserves repositories", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const modifiedSkillFile = join(
    environment.userHome,
    ".agents",
    "skills",
    "rkc-help",
    "local-edit.txt",
  );
  await writeFile(modifiedSkillFile, "delete with managed skill\n", "utf8");
  const repositorySentinel = join(
    environment.root,
    "repositories",
    "repository-a",
    "README.md",
  );
  await mkdir(dirname(repositorySentinel), { recursive: true });
  await writeFile(repositorySentinel, "preserved\n", "utf8");

  const result = await uninstall({
    confirmed: true,
    testUserHome: environment.userHome,
  });
  assert.equal(result.success, true);
  assert.equal(
    result.targets.filter((target) => target.status === "removed").length,
    9,
  );
  assert.equal(
    result.targets.filter((target) => target.status === "absent").length,
    0,
  );
  await assert.rejects(readFile(modifiedSkillFile, "utf8"), /ENOENT/u);
  await assert.rejects(
    readFile(join(environment.userHome, ".rkc", "current.json"), "utf8"),
    /ENOENT/u,
  );
  assert.equal(await readFile(repositorySentinel, "utf8"), "preserved\n");

  const repeated = await uninstall({
    confirmed: true,
    testUserHome: environment.userHome,
  });
  assert.equal(repeated.success, true);
  assert.ok(repeated.targets.every((target) => target.status === "absent"));
});

void test("uninstall preserves an unmanaged Claude Code collision", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const collision = join(environment.userHome, ".claude", "skills", "rkc-help");
  await rm(collision, { force: true, recursive: true });
  await mkdir(collision, { recursive: true });
  await writeFile(
    join(collision, "SKILL.md"),
    "# User-owned replacement\n",
    "utf8",
  );
  const canonicalCollision = await realpath(collision);

  const preview = await uninstall({
    dryRun: true,
    testUserHome: environment.userHome,
  });
  assert.deepEqual(
    preview.targets.filter((target) => target.status === "preserved"),
    [{ path: canonicalCollision, status: "preserved" }],
  );

  const result = await uninstall({
    confirmed: true,
    testUserHome: environment.userHome,
  });
  assert.equal(result.success, true);
  assert.deepEqual(
    result.targets.filter((target) => target.status === "preserved"),
    [{ path: canonicalCollision, status: "preserved" }],
  );
  assert.equal(
    await readFile(join(collision, "SKILL.md"), "utf8"),
    "# User-owned replacement\n",
  );
});

void test("uninstall reports a fixed-target partial failure without widening scope", async (context) => {
  const environment = await createTestEnvironment(context);
  const installed = await install({ testUserHome: environment.userHome });
  const failedTarget = join(
    installed.user_home,
    ".agents",
    "skills",
    "rkc-help",
  );

  const result = await uninstall({
    confirmed: true,
    testRemoveTarget: async (path) => {
      if (path === failedTarget) throw new Error("injected permission failure");
      await rm(path, { force: true, recursive: true });
    },
    testUserHome: environment.userHome,
  });
  assert.equal(result.success, false);
  assert.deepEqual(
    result.targets.filter((target) => target.status === "failed"),
    [
      {
        error: "injected permission failure",
        path: failedTarget,
        status: "failed",
      },
    ],
  );
  await readFile(join(failedTarget, "SKILL.md"), "utf8");
  assert.equal(result.targets.length, 9);
});

void test("CLI uninstall requires deliberate confirmation and supports dry-run and --yes", async (context) => {
  const environment = await createTestEnvironment(context);
  const cli = join(dirname(fileURLToPath(import.meta.url)), "cli.js");
  const processEnvironment = {
    ...process.env,
    [TEST_USER_HOME_VARIABLE]: environment.userHome,
  };
  await execFileAsync(process.execPath, [cli, "install"], {
    env: processEnvironment,
  });

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "uninstall"], {
      env: processEnvironment,
    }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal("code" in error ? error.code : undefined, 2);
      assert.match(
        "stderr" in error ? String(error.stderr) : "",
        /Rerun with --yes/u,
      );
      return true;
    },
  );
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );

  const dryRun = await execFileAsync(
    process.execPath,
    [cli, "uninstall", "--dry-run"],
    { env: processEnvironment },
  );
  assert.match(dryRun.stdout, /present: .*\.rkc/u);
  assert.equal(
    await installedVersion(environment.userHome),
    FOUNDATION_VERSION,
  );

  const removed = await execFileAsync(
    process.execPath,
    [cli, "uninstall", "--yes"],
    { env: processEnvironment },
  );
  assert.match(removed.stdout, /removed: .*\.rkc/u);
  await assert.rejects(
    installedVersion(environment.userHome),
    /not installed/u,
  );
});

void test("doctor uses the installed core for forced, cached, disabled, and enabled update status", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });

  const checked = await doctor({
    latestVersionSource: () => Promise.resolve("2.0.1"),
    mode: "check",
    now: new Date("2026-08-17T08:00:00.000Z"),
    testUserHome: environment.userHome,
  });
  assert.equal(checked.update.status, "UPDATE_AVAILABLE");
  assert.equal(checked.update.major_update, false);
  assert.equal(checked.update.source, "live");

  const cached = await doctor({ testUserHome: environment.userHome });
  assert.equal(cached.update.source, "cache");
  assert.equal(cached.update.latest_version, "2.0.1");

  const disabled = await doctor({
    mode: "disable",
    testUserHome: environment.userHome,
  });
  assert.equal(disabled.update.automatic_enabled, false);
  const forcedWhileDisabled = await doctor({
    latestVersionSource: () => Promise.resolve("2.0.2"),
    mode: "check",
    testUserHome: environment.userHome,
  });
  assert.equal(forcedWhileDisabled.update.performed, true);
  assert.equal(forcedWhileDisabled.update.automatic_enabled, false);

  const enabled = await doctor({
    mode: "enable",
    testUserHome: environment.userHome,
  });
  assert.equal(enabled.update.automatic_enabled, true);
});

void test("installed help uses matching core self-description and remains read-only", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const repository = join(environment.root, "repositories", "help-project");
  await mkdir(repository, { recursive: true });
  const sentinel = join(repository, "sentinel.txt");
  await writeFile(sentinel, "unchanged\n", "utf8");

  const overview = await help({
    testUserHome: environment.userHome,
    topic: "overview",
  });
  assert.equal(overview.mode, "explanation");
  assert.equal(overview.manifest.distribution_version, FOUNDATION_VERSION);

  const project = await help({
    repositoryRoot: repository,
    testUserHome: environment.userHome,
    topic: "project_status",
  });
  assert.equal(project.project_context?.state, "absent");

  const route = await help({
    action: "create-docs",
    testUserHome: environment.userHome,
  });
  assert.equal(route.route?.skill, "rkc-create-docs");
  assert.equal(route.route?.performed, false);
  assert.equal(await readFile(sentinel, "utf8"), "unchanged\n");
});

void test("post-operation discovery is terminal-only, best-effort, and notices once per version", async (context) => {
  const environment = await createTestEnvironment(context);
  await install({ testUserHome: environment.userHome });
  const notices: string[] = [];

  const premature = await runPostOperationUpdateDiscovery({
    displayNotice: (notice) => {
      notices.push(notice);
    },
    latestVersionSource: () => Promise.resolve("2.0.1"),
    operation: "rkc-create-docs",
    terminalResultKnown: false,
    testUserHome: environment.userHome,
  });
  assert.equal(premature.attempted, false);
  assert.equal(premature.skipped_reason, "primary_result_not_terminal");

  const discovered = await runPostOperationUpdateDiscovery({
    displayNotice: (notice) => {
      notices.push(notice);
    },
    latestVersionSource: () => Promise.resolve("2.0.1"),
    now: new Date("2026-08-17T08:00:00.000Z"),
    operation: "rkc-create-docs",
    terminalResultKnown: true,
    testUserHome: environment.userHome,
  });
  assert.equal(discovered.attempted, true);
  assert.equal(discovered.notice_displayed, true);
  assert.equal(notices.length, 1);
  assert.match(
    notices[0] ?? "",
    new RegExp(`Installed: ${escapeRegExp(FOUNDATION_VERSION)}`, "u"),
  );
  assert.match(notices[0] ?? "", /Available: 2\.0\.1/u);
  assert.doesNotMatch(notices[0] ?? "", /major-version update/u);
  assert.match(notices[0] ?? "", /No update was installed automatically/u);
  assert.match(
    notices[0] ?? "",
    /npx repository-knowledge-compiler@latest self-update/u,
  );

  const repeated = await runPostOperationUpdateDiscovery({
    displayNotice: (notice) => {
      notices.push(notice);
    },
    latestVersionSource: () => Promise.resolve("2.0.1"),
    now: new Date("2026-08-18T08:00:00.000Z"),
    operation: "rkc-audit-docs",
    terminalResultKnown: true,
    testUserHome: environment.userHome,
  });
  assert.equal(repeated.notice_displayed, false);
  assert.equal(repeated.update?.skipped_reason, "success_cadence");
  assert.equal(notices.length, 1);

  const adapterFailure = await runPostOperationUpdateDiscovery({
    displayNotice: () => {
      throw new Error("host output unavailable");
    },
    latestVersionSource: () => Promise.resolve("2.1.0"),
    now: new Date("2026-08-25T08:00:00.000Z"),
    operation: "rkc-update-docs",
    terminalResultKnown: true,
    testUserHome: environment.userHome,
  });
  assert.equal(adapterFailure.notice_displayed, false);
  assert.equal(adapterFailure.skipped_reason, "best_effort_failure");
});

void test("self-update retains active plus two previous usable versions and never prunes on failure", async (context) => {
  const environment = await createTestEnvironment(context);
  const payloads = new Map<string, string>();
  for (const version of ["1.0.0", "1.1.0", "1.2.0", "2.0.0", "3.0.0"]) {
    payloads.set(
      version,
      await createPayloadVariant(environment.root, version),
    );
  }

  await install({
    payloadRoot: requiredPayload(payloads, "1.0.0"),
    testUserHome: environment.userHome,
    testVersion: "1.0.0",
  });
  for (const version of ["1.1.0", "1.2.0", "2.0.0"]) {
    await selfUpdate({
      payloadRoot: requiredPayload(payloads, version),
      testUserHome: environment.userHome,
      testVersion: version,
    });
  }

  const versionsRoot = join(environment.userHome, ".rkc", "versions");
  assert.deepEqual((await readdir(versionsRoot)).sort(), [
    "1.1.0",
    "1.2.0",
    "2.0.0",
  ]);
  assert.equal(await installedVersion(environment.userHome), "2.0.0");

  await assert.rejects(
    selfUpdate({
      payloadRoot: requiredPayload(payloads, "3.0.0"),
      testInterruptionAfterSkill: 1,
      testUserHome: environment.userHome,
      testVersion: "3.0.0",
    }),
    /Simulated installer interruption/u,
  );
  assert.deepEqual((await readdir(versionsRoot)).sort(), [
    "1.1.0",
    "1.2.0",
    "2.0.0",
    "3.0.0",
  ]);
  assert.equal(await installedVersion(environment.userHome), "2.0.0");
});

async function createTestEnvironment(context: TestContext): Promise<{
  root: string;
  userHome: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "rkc-stage10-"));
  context.after(async () => rm(root, { force: true, recursive: true }));
  const userHome = join(root, "user-home");
  await mkdir(userHome, { recursive: true });
  await writeFile(
    join(root, TEST_ROOT_MARKER),
    `${JSON.stringify({ root }, null, 2)}\n`,
    "utf8",
  );
  return { root, userHome };
}

async function createPayloadVariant(
  testRoot: string,
  version: string,
): Promise<string> {
  const source = join(dirname(fileURLToPath(import.meta.url)), "..", "payload");
  const target = join(testRoot, "payloads", version);
  await cp(source, target, { recursive: true });
  const manifestPath = join(target, "payload-manifest.json");
  const manifest = await readJson(manifestPath);
  await writeFile(
    manifestPath,
    `${JSON.stringify({ ...manifest, version }, null, 2)}\n`,
    "utf8",
  );
  const selfDescriptionPath = join(target, "self-description-manifest.json");
  const selfDescription = await readJson(selfDescriptionPath);
  await writeFile(
    selfDescriptionPath,
    `${JSON.stringify(
      { ...selfDescription, distribution_version: version },
      null,
      2,
    )}\n`,
    "utf8",
  );
  return target;
}

function requiredPayload(
  payloads: Map<string, string>,
  version: string,
): string {
  const payload = payloads.get(version);
  if (payload === undefined)
    throw new Error(`Missing test payload ${version}.`);
  return payload;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}
