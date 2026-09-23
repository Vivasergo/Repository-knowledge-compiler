import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { TEST_USER_HOME_VARIABLE } from "../packages/bootstrap/dist/lifecycle.js";

import {
  cleanupE2eEnvironment,
  createE2eEnvironment,
  digestTree,
  pathExists,
  runPackedRkc,
} from "./e2e-lifecycle-helpers.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const environment = await createE2eEnvironment("e2e-lifecycle");
try {
  const expectedVersion = environment.metadata.version;
  const availableVersion = nextStablePatchVersion(expectedVersion);
  const repositoryA = join(environment.repositories, "repository-a");
  const repositoryB = join(environment.repositories, "repository-b");
  await Promise.all([
    cp(
      join(workspaceRoot, "fixtures", "stage-4", "node-api-monorepo"),
      repositoryA,
      { recursive: true },
    ),
    cp(
      join(workspaceRoot, "fixtures", "stage-4", "python-worker-infra"),
      repositoryB,
      { recursive: true },
    ),
  ]);
  const sourceDigestA = await digestTree(repositoryA, {
    excludeProjectState: true,
  });

  await runPackedRkc(environment, ["install"], repositoryA);
  const current = JSON.parse(
    await readFile(join(environment.userHome, ".rkc", "current.json"), "utf8"),
  );
  const installedCoreUrl = pathToFileURL(
    join(
      current.version_path,
      "node_modules",
      "@rkc",
      "core",
      "dist",
      "index.js",
    ),
  );
  const installedCore = await import(installedCoreUrl.href);
  const updateStatePath = join(
    environment.userHome,
    ".rkc",
    "update-check.json",
  );
  await installedCore.setAutomaticUpdateChecks(updateStatePath, false);
  const postOperationEntry = join(
    current.version_path,
    "node_modules",
    "repository-knowledge-compiler",
    "dist",
    "post-operation.js",
  );
  const postOperation = await execFileAsync(
    process.execPath,
    [postOperationEntry, "rkc-create-docs"],
    {
      cwd: repositoryA,
      env: {
        ...process.env,
        [TEST_USER_HOME_VARIABLE]: environment.userHome,
      },
    },
  );
  assert.equal(postOperation.stdout, "");
  assert.equal(postOperation.stderr, "");
  const checkedAt = new Date().toISOString();
  await writeFile(
    updateStatePath,
    `${JSON.stringify({
      format_version: 1,
      automatic_enabled: true,
      installed_version: expectedVersion,
      latest_version: availableVersion,
      comparison_status: "UPDATE_AVAILABLE",
      last_attempt_at: checkedAt,
      last_attempt_succeeded: true,
      last_success_at: checkedAt,
    })}\n`,
    "utf8",
  );
  const notice = await execFileAsync(
    process.execPath,
    [postOperationEntry, "rkc-update-docs"],
    {
      cwd: repositoryA,
      env: {
        ...process.env,
        [TEST_USER_HOME_VARIABLE]: environment.userHome,
      },
    },
  );
  assert.match(
    notice.stdout,
    new RegExp(`Available: ${availableVersion}`, "u"),
  );
  assert.match(
    notice.stdout,
    /Recommended update command: npx repository-knowledge-compiler@latest self-update/u,
  );
  assert.match(notice.stdout, /No update was installed automatically/u);
  assert.equal(notice.stderr, "");
  const repeatedNotice = await execFileAsync(
    process.execPath,
    [postOperationEntry, "rkc-audit-docs"],
    {
      cwd: repositoryA,
      env: {
        ...process.env,
        [TEST_USER_HOME_VARIABLE]: environment.userHome,
      },
    },
  );
  assert.equal(repeatedNotice.stdout, "");
  assert.equal(repeatedNotice.stderr, "");
  await rm(updateStatePath);

  const coreManifest = JSON.parse(
    await readFile(join(current.version_path, "core-manifest.json"), "utf8"),
  );
  const installedHostBoundary = await import(
    pathToFileURL(join(current.version_path, coreManifest.host_boundary_entry))
      .href
  );
  const helpA = await installedCore.resolveRkcHelp({
    distribution_version: current.active_version,
    repository_root: repositoryA,
    topic: "project_status",
  });
  assert.equal(helpA.project_context.state, "absent");
  assert.equal(await pathExists(join(repositoryA, ".rkc")), false);
  await mkdir(join(repositoryB, "docs", "ai"), { recursive: true });
  await writeFile(join(repositoryB, "AGENTS.md"), "# Agent routes\n", "utf8");
  await writeFile(
    join(repositoryB, "docs", "ai", "README.md"),
    "# Router\n\nVerified source revision: `abcdef1234567abcdef1234567abcdef1234567a`\n",
    "utf8",
  );
  const helpB = await installedCore.resolveRkcHelp({
    distribution_version: current.active_version,
    repository_root: repositoryB,
    topic: "project_status",
  });
  assert.equal(helpB.project_context.state, "present");
  assert.equal(
    helpB.project_context.last_verified_revision,
    "abcdef1234567abcdef1234567abcdef1234567a",
  );
  assert.equal(await pathExists(join(repositoryB, ".rkc")), false);
  assert.equal(
    await digestTree(repositoryA, { excludeProjectState: true }),
    sourceDigestA,
  );
  assert.equal(await pathExists(join(repositoryB, "package.json")), false);
  assert.equal(await pathExists(join(repositoryB, "node_modules")), false);

  const notices = [];
  const updateDiscovery =
    await installedHostBoundary.runPostOperationUpdateDiscovery({
      displayNotice: (notice) => notices.push(notice),
      latestVersionSource: async () => availableVersion,
      now: new Date("2026-08-23T09:00:00.000Z"),
      operation: "rkc-create-docs",
      terminalResultKnown: true,
      testUserHome: environment.userHome,
    });
  assert.equal(updateDiscovery.attempted, true);
  assert.equal(updateDiscovery.notice_displayed, true);
  assert.equal(notices.length, 1);
  assert.ok((notices[0] ?? "").includes(`Installed: ${expectedVersion}\n`));
  assert.ok((notices[0] ?? "").includes(`Available: ${availableVersion}\n`));
  assert.match(notices[0], /No update was installed automatically\./u);
  assert.equal(
    await digestTree(repositoryA, { excludeProjectState: true }),
    sourceDigestA,
  );

  const projectStateDigest = await digestTree(environment.repositories);

  const selfUpdate = await runPackedRkc(
    environment,
    ["self-update"],
    repositoryA,
  );
  assert.ok(
    selfUpdate.stdout.includes(`Retained: ${expectedVersion}\n`),
    `Self-update retained an unexpected version: ${selfUpdate.stdout}`,
  );
  const dryRun = await runPackedRkc(
    environment,
    ["uninstall", "--dry-run"],
    repositoryB,
  );
  assert.match(dryRun.stdout, /present: .*\.rkc/u);
  assert.equal(await digestTree(environment.repositories), projectStateDigest);

  const removed = await runPackedRkc(
    environment,
    ["uninstall", "--yes"],
    repositoryA,
  );
  assert.match(removed.stdout, /removed: .*\.rkc/u);
  assert.equal(await digestTree(environment.repositories), projectStateDigest);
  assert.equal(
    await pathExists(join(environment.userHome, ".rkc", "current.json")),
    false,
  );
  for (const skill of [
    "rkc-help",
    "rkc-create-docs",
    "rkc-update-docs",
    "rkc-audit-docs",
  ]) {
    for (const hostRoot of [".agents", ".claude"]) {
      assert.equal(
        await pathExists(
          join(environment.userHome, hostRoot, "skills", skill, "SKILL.md"),
        ),
        false,
      );
    }
  }
  const repeatedUninstall = await runPackedRkc(
    environment,
    ["uninstall", "--yes"],
    repositoryB,
  );
  assert.match(repeatedUninstall.stdout, /absent: .*\.rkc/u);
  assert.equal(await digestTree(environment.repositories), projectStateDigest);

  process.stdout.write(
    "Tarball lifecycle E2E passed for Node monorepo and Python repository.\n",
  );
} finally {
  await cleanupE2eEnvironment(environment);
}

function nextStablePatchVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/u.exec(version);
  if (!match) throw new Error(`Packed version is not valid semver: ${version}`);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}
