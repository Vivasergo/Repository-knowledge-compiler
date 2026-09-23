import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  cleanupE2eEnvironment,
  createE2eEnvironment,
  digestTree,
  runPackedRkc,
} from "./e2e-lifecycle-helpers.mjs";

const environment = await createE2eEnvironment("e2e-install");
try {
  const expectedVersion = environment.metadata.version;
  const repositoryA = join(environment.repositories, "repository-a");
  const repositoryB = join(environment.repositories, "repository-b");
  await Promise.all([
    mkdir(repositoryA, { recursive: true }),
    mkdir(repositoryB, { recursive: true }),
  ]);
  await writeFile(
    join(repositoryA, "package.json"),
    '{"name":"install-sentinel","private":true}\n',
    "utf8",
  );
  await writeFile(join(repositoryB, "sentinel.txt"), "unchanged\n", "utf8");
  const repositoryDigest = await digestTree(environment.repositories);

  assertPackageContents(environment.metadata);
  const first = await runPackedRkc(environment, ["install"], repositoryA);
  assert.ok(
    first.stdout.startsWith(`RKC ${expectedVersion} installed.\n`),
    `Installer reported an unexpected version: ${first.stdout}`,
  );
  assert.equal(first.stderr, "");

  const currentPath = join(environment.userHome, ".rkc", "current.json");
  const current = JSON.parse(await readFile(currentPath, "utf8"));
  assert.equal(current.active_version, expectedVersion);
  const selfDescription = JSON.parse(
    await readFile(
      join(current.version_path, "self-description-manifest.json"),
      "utf8",
    ),
  );
  assert.equal(selfDescription.distribution_version, expectedVersion);
  assert.deepEqual(
    selfDescription.supported_hosts.map((host) => host.id),
    ["codex-vscode", "github-copilot-vscode"],
  );
  assert.equal(selfDescription.provider_specific_instruction_files, false);
  await readFile(
    join(
      current.version_path,
      "node_modules",
      "@rkc",
      "core",
      "dist",
      "index.js",
    ),
    "utf8",
  );
  const coreManifest = JSON.parse(
    await readFile(join(current.version_path, "core-manifest.json"), "utf8"),
  );
  assert.equal(
    coreManifest.host_boundary_entry,
    "node_modules/repository-knowledge-compiler/dist/maintenance.js",
  );
  assert.equal(
    coreManifest.documentation_master_prompt,
    "documentation/RKC-Documentation-Master-Prompt.md",
  );
  assert.equal(
    coreManifest.documentation_prompt_version,
    "RKC-DOCS-CREATE-2.14",
  );
  const masterPrompt = await readFile(
    join(current.version_path, coreManifest.documentation_master_prompt),
    "utf8",
  );
  assert.match(masterPrompt, /RKC-DOCS-CREATE-2\.14/u);
  assert.match(masterPrompt, /planned coverage map/u);
  assert.match(masterPrompt, /TASK-LOCAL DOCUMENTATION FEEDBACK/u);
  assert.match(
    masterPrompt,
    /Do not expand one discrepancy into a repository-wide audit/u,
  );
  assert.match(masterPrompt, /material missing coverage/u);
  assert.match(masterPrompt, /Do not create orphan notes or documents/u);
  assert.match(
    masterPrompt,
    /Do not imply that unverified sibling paths or an entire domain were covered/u,
  );
  assert.match(masterPrompt, /appropriately scoped findings report/u);
  assert.match(
    masterPrompt,
    /resolved QA work as internal verification and refinement/u,
  );
  assert.match(masterPrompt, /pre-existing owner changes/u);
  assert.match(
    masterPrompt,
    /cannot erase or falsely acknowledge newer changes/u,
  );
  assert.match(
    masterPrompt,
    /Do not introduce mixed line endings or trailing whitespace/u,
  );
  assert.match(
    masterPrompt,
    /Do not recommend `\/rkc-update-docs` solely because that documentation-only commit/u,
  );
  assert.match(masterPrompt, /Do not use a default "key preserved knowledge"/u);
  await readFile(
    join(current.version_path, coreManifest.host_boundary_entry),
    "utf8",
  );
  for (const skill of [
    "rkc-help",
    "rkc-create-docs",
    "rkc-update-docs",
    "rkc-audit-docs",
  ]) {
    await readFile(
      join(environment.userHome, ".agents", "skills", skill, "SKILL.md"),
      "utf8",
    );
    await readFile(
      join(environment.userHome, ".claude", "skills", skill, "SKILL.md"),
      "utf8",
    );
  }

  for (const skill of [
    "rkc-create-docs",
    "rkc-update-docs",
    "rkc-audit-docs",
  ]) {
    const instructions = await readFile(
      join(environment.userHome, ".agents", "skills", skill, "SKILL.md"),
      "utf8",
    );
    assert.match(instructions, /post-operation\.js/u);
  }

  const helpSkill = await readFile(
    join(environment.userHome, ".agents", "skills", "rkc-help", "SKILL.md"),
    "utf8",
  );
  assert.match(helpSkill, /Available RKC skills/u);
  assert.match(helpSkill, /`\/rkc-audit-docs`/u);

  const repeated = await runPackedRkc(environment, ["install"], repositoryB);
  assert.ok(
    repeated.stdout.startsWith(`RKC ${expectedVersion} verified.\n`),
    `Repeat installer reported an unexpected version: ${repeated.stdout}`,
  );
  const version = await runPackedRkc(environment, ["version"], repositoryB);
  assert.equal(version.stdout, `${expectedVersion}\n`);
  assert.equal(await digestTree(environment.repositories), repositoryDigest);

  process.stdout.write(
    `Tarball install E2E passed: ${environment.metadata.filename}\n`,
  );
} finally {
  await cleanupE2eEnvironment(environment);
}

function assertPackageContents(metadata) {
  const files = new Set(metadata.files.map((entry) => entry.path));
  for (const required of [
    "LICENSE",
    "dist/cli.js",
    "dist/lifecycle.js",
    "payload/payload-manifest.json",
    "payload/self-description-manifest.json",
    "payload/documentation/RKC-Documentation-Master-Prompt.md",
    "payload/node_modules/@rkc/core/dist/index.js",
    "payload/node_modules/repository-knowledge-compiler/dist/maintenance.js",
    "payload/node_modules/repository-knowledge-compiler/dist/post-operation.js",
    "payload/skills/rkc-help/SKILL.md",
    "payload/skills/rkc-create-docs/SKILL.md",
    "payload/skills/rkc-update-docs/SKILL.md",
    "payload/skills/rkc-audit-docs/SKILL.md",
  ]) {
    assert.ok(files.has(required), `Packed artifact is missing ${required}.`);
  }
  assert.ok(
    [...files].every(
      (path) => !path.includes(".test.") && !path.endsWith(".tsbuildinfo"),
    ),
    "Packed artifact contains build/test-only files.",
  );
}
