import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import {
  createSelfDescriptionManifest,
  getSelfDescriptionModule,
} from "./catalog.js";
import { inspectProjectHelpContext, resolveRkcHelp } from "./help.js";

void test("publishes the V2 Markdown-first self-description", () => {
  const manifest = createSelfDescriptionManifest("2.0.0");
  assert.equal(manifest.distribution_version, "2.0.0");
  assert.equal(manifest.documentation_prompt_version, "RKC-DOCS-CREATE-2.14");
  assert.deepEqual(manifest.skills, [
    "rkc-help",
    "rkc-create-docs",
    "rkc-update-docs",
    "rkc-audit-docs",
  ]);
  assert.equal(manifest.provider_specific_instruction_files, false);
  assert.equal(getSelfDescriptionModule("safety").topic, "safety");
  assert.throws(
    () => createSelfDescriptionManifest("not-a-version"),
    /valid SemVer/u,
  );
});

void test("routes action intent without performing a mutation", async () => {
  const result = await resolveRkcHelp({
    action: "update-docs",
    distribution_version: "2.0.0",
  });
  assert.equal(result.mode, "route");
  assert.deepEqual(result.route, {
    action: "update-docs",
    skill: "rkc-update-docs",
    performed: false,
  });
  await assert.rejects(
    resolveRkcHelp({
      action: "compile",
      distribution_version: "2.0.0",
    }),
    /Unsupported RKC action route/u,
  );
});

void test("reports cloned documentation without project state", async (context) => {
  const repository = await createRepository(context);
  await mkdir(join(repository, "docs", "ai"), { recursive: true });
  await writeFile(join(repository, "AGENTS.md"), "# Agent routes\n", "utf8");
  await writeFile(
    join(repository, "docs", "ai", "README.md"),
    "# Router\n\nVerified source revision: `abcdef1234567abcdef1234567abcdef1234567a`\n",
    "utf8",
  );
  const result = await resolveRkcHelp({
    distribution_version: "2.0.0",
    repository_root: repository,
    topic: "project_status",
  });
  assert.equal(result.project_context?.state, "present");
  assert.equal(result.project_context?.evidence.router, "present");
  assert.equal(
    result.project_context?.last_verified_revision,
    "abcdef1234567abcdef1234567abcdef1234567a",
  );
});

void test("legacy state does not block absent or incomplete documentation", async (context) => {
  const repository = await createRepository(context);
  await mkdir(join(repository, ".rkc"), { recursive: true });
  await writeFile(
    join(repository, ".rkc", "documentation-state.json"),
    "not-json\n",
    "utf8",
  );
  assert.equal((await inspectProjectHelpContext(repository)).state, "absent");
  await writeFile(join(repository, "AGENTS.md"), "# Routes\n", "utf8");
  assert.equal((await inspectProjectHelpContext(repository)).state, "present");
  await writeFile(
    join(repository, "AGENTS.md"),
    "[Router](docs/ai/README.md)\n",
    "utf8",
  );
  assert.equal(
    (await inspectProjectHelpContext(repository)).state,
    "incomplete",
  );
  assert.equal(
    (await inspectProjectHelpContext(join(repository, "missing"))).state,
    "inaccessible",
  );
});

async function createRepository(context: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rkc-help-"));
  context.after(async () => rm(root, { force: true, recursive: true }));
  await writeFile(join(root, "sentinel.txt"), "unchanged\n", "utf8");
  return root;
}
