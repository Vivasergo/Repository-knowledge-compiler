import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import {
  cachedCoreUpdateStatus,
  checkForCoreUpdate,
  compareVersions,
  recordUpdateNotification,
  setAutomaticUpdateChecks,
} from "./update-discovery.js";

void test("compares stable and prerelease SemVer into all update statuses", () => {
  assert.equal(compareVersions("1.0.0", "1.1.0"), "UPDATE_AVAILABLE");
  assert.equal(compareVersions("1.0.0", "1.0.0"), "UP_TO_DATE");
  assert.equal(compareVersions("2.0.0", "1.9.9"), "AHEAD_OF_LATEST");
  assert.equal(compareVersions("1.0.0-beta.1", "1.0.0"), "UPDATE_AVAILABLE");
  assert.throws(() => compareVersions("v1", "1.0.0"), /Invalid SemVer/u);
});

void test("enforces seven-day success cadence and forced-check bypass", async (context) => {
  const statePath = await createStatePath(context);
  let calls = 0;
  const source = (): Promise<string> => {
    calls += 1;
    return Promise.resolve("1.1.0");
  };
  const first = await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: source,
    now: new Date("2026-08-01T00:00:00.000Z"),
    statePath,
  });
  assert.equal(first.performed, true);
  assert.equal(first.status, "UPDATE_AVAILABLE");

  const skipped = await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: source,
    now: new Date("2026-08-07T23:59:59.999Z"),
    statePath,
  });
  assert.equal(skipped.performed, false);
  assert.equal(skipped.skipped_reason, "success_cadence");
  assert.equal(skipped.source, "cache");

  const forced = await checkForCoreUpdate({
    forced: true,
    installedVersion: "1.0.0",
    latestVersionSource: source,
    now: new Date("2026-08-02T00:00:00.000Z"),
    statePath,
  });
  assert.equal(forced.performed, true);
  assert.equal(calls, 2);
});

void test("uses 24-hour retry after failure and preserves the last successful cache", async (context) => {
  const statePath = await createStatePath(context);
  await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("1.1.0"),
    now: new Date("2026-08-01T00:00:00.000Z"),
    statePath,
  });
  const failure = await checkForCoreUpdate({
    forced: true,
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.reject(new Error("offline")),
    now: new Date("2026-08-02T00:00:00.000Z"),
    statePath,
  });
  assert.equal(failure.status, "UNKNOWN");
  assert.equal(failure.failure_category, "invalid_response");
  assert.equal(failure.last_success_at, "2026-08-01T00:00:00.000Z");

  const skipped = await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("1.2.0"),
    now: new Date("2026-08-02T23:59:59.999Z"),
    statePath,
  });
  assert.equal(skipped.performed, false);
  assert.equal(skipped.skipped_reason, "failure_cadence");
  assert.equal(skipped.status, "UPDATE_AVAILABLE");
  assert.equal(skipped.latest_version, "1.1.0");

  const retried = await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("1.2.0"),
    now: new Date("2026-08-03T00:00:00.000Z"),
    statePath,
  });
  assert.equal(retried.performed, true);
  assert.equal(retried.latest_version, "1.2.0");
});

void test("supports machine disablement while forced checks remain available", async (context) => {
  const statePath = await createStatePath(context);
  await setAutomaticUpdateChecks(statePath, false);
  const skipped = await checkForCoreUpdate({
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("1.1.0"),
    statePath,
  });
  assert.equal(skipped.skipped_reason, "disabled");
  assert.equal(skipped.performed, false);

  const forced = await checkForCoreUpdate({
    forced: true,
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("1.1.0"),
    statePath,
  });
  assert.equal(forced.performed, true);
  assert.equal(forced.automatic_enabled, false);
});

void test("recovers corrupt cache and emits once-per-version notification state", async (context) => {
  const statePath = await createStatePath(context);
  await writeFile(statePath, "not-json\n", "utf8");
  const checked = await checkForCoreUpdate({
    forced: true,
    installedVersion: "1.9.0",
    latestVersionSource: () => Promise.resolve("2.0.0"),
    now: new Date("2026-08-17T08:00:00.000Z"),
    statePath,
  });
  assert.equal(checked.cache_recovered, true);
  assert.equal(checked.notification_required, true);
  assert.equal(checked.major_update, true);

  await recordUpdateNotification(statePath, "2.0.0");
  const cached = await cachedCoreUpdateStatus(statePath, "1.9.0");
  assert.equal(cached.notification_required, false);
  assert.equal(cached.source, "cache");
  const persisted = await readFile(statePath, "utf8");
  assert.doesNotThrow(() => JSON.parse(persisted));
});

void test("does not recommend a prerelease from the stable latest channel", async (context) => {
  const statePath = await createStatePath(context);
  const checked = await checkForCoreUpdate({
    forced: true,
    installedVersion: "1.0.0",
    latestVersionSource: () => Promise.resolve("2.0.0-beta.1"),
    statePath,
  });
  assert.equal(checked.status, "UNKNOWN");
  assert.equal(checked.failure_category, "invalid_version");
});

async function createStatePath(context: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rkc-update-check-"));
  context.after(async () => rm(root, { force: true, recursive: true }));
  return join(root, "update-check.json");
}
