import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { TEST_PAUSE_AFTER_PREPARED_VARIABLE } from "../packages/bootstrap/dist/lifecycle.js";
import {
  captureProcessOutput,
  cleanupE2eEnvironment,
  createE2eEnvironment,
  digestTree,
  killProcessTree,
  pathExists,
  runPackedRkc,
  spawnPackedRkc,
  waitForPath,
} from "./e2e-lifecycle-helpers.mjs";

const environment = await createE2eEnvironment("e2e-process-kill");
try {
  const expectedVersion = environment.metadata.version;
  const repository = join(environment.repositories, "repository-a");
  await mkdir(repository, { recursive: true });
  await writeFile(join(repository, "sentinel.txt"), "unchanged\n", "utf8");
  const repositoryDigest = await digestTree(environment.repositories);

  await runPackedRkc(environment, ["install"], repository);
  const currentPath = join(environment.userHome, ".rkc", "current.json");
  const currentBefore = await readFile(currentPath, "utf8");
  const skillMetadataBefore = await readSkillMetadata(environment.userHome);
  const readyFile = join(environment.root, "prepared.ready");
  const journalPath = join(
    environment.userHome,
    ".rkc",
    "install-transaction.json",
  );

  const installer = spawnPackedRkc(environment, ["install"], repository, {
    [TEST_PAUSE_AFTER_PREPARED_VARIABLE]: readyFile,
  });
  const processOutput = captureProcessOutput(installer);
  try {
    await waitForPath(readyFile, installer);
  } catch (error) {
    await killProcessTree(installer);
    const output = processOutput();
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`,
      { cause: error },
    );
  }
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  assert.equal(journal.phase, "prepared");
  await killProcessTree(installer);

  assert.equal(await pathExists(journalPath), true);
  assert.equal(await readFile(currentPath, "utf8"), currentBefore);
  assert.deepEqual(
    await readSkillMetadata(environment.userHome),
    skillMetadataBefore,
  );
  assert.equal(await digestTree(environment.repositories), repositoryDigest);

  const recovered = await runPackedRkc(environment, ["install"], repository);
  assert.ok(
    recovered.stdout.startsWith(`RKC ${expectedVersion} verified.\n`),
    `Recovered installer reported an unexpected version: ${recovered.stdout}`,
  );
  assert.equal(await pathExists(journalPath), false);
  for (const hostRoot of [".agents", ".claude"]) {
    const skillsRoot = join(environment.userHome, hostRoot, "skills");
    const temporaryEntries = (await readdir(skillsRoot)).filter(
      (name) =>
        name.startsWith(".rkc-staging-") || name.startsWith(".rkc-backup-"),
    );
    assert.deepEqual(temporaryEntries, []);
  }
  assert.deepEqual(
    (await readSkillMetadata(environment.userHome)).map(
      (metadata) => metadata.core_version,
    ),
    Array.from({ length: 4 }, () => expectedVersion),
  );
  for (const skill of [
    "rkc-help",
    "rkc-create-docs",
    "rkc-update-docs",
    "rkc-audit-docs",
  ]) {
    await readFile(
      join(environment.userHome, ".claude", "skills", skill, "SKILL.md"),
      "utf8",
    );
  }
  assert.equal(await digestTree(environment.repositories), repositoryDigest);

  process.stdout.write(
    "Tarball process-kill recovery E2E passed from a prepared transaction.\n",
  );
} finally {
  await cleanupE2eEnvironment(environment);
}

async function readSkillMetadata(userHome) {
  return Promise.all(
    ["rkc-help", "rkc-create-docs", "rkc-update-docs", "rkc-audit-docs"].map(
      async (skill) =>
        JSON.parse(
          await readFile(
            join(userHome, ".agents", "skills", skill, "installation.json"),
            "utf8",
          ),
        ),
    ),
  );
}
