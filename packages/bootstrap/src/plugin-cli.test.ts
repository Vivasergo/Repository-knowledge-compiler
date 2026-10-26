import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test, { type TestContext } from "node:test";

import { BOOTSTRAP_PACKAGE_NAME, FOUNDATION_VERSION } from "./identity.js";
import { TEST_ROOT_MARKER, TEST_USER_HOME_VARIABLE } from "./lifecycle.js";
import {
  PLUGIN_SKILLS,
  runPluginCli,
  type PluginCoreModule,
} from "./plugin-cli.js";

const promptVersion = "RKC-DOCS-CREATE-9.9";

void test("plugin version validates every version-bearing plugin file", async (context) => {
  const environment = await createPluginEnvironment(context);
  const ok = await run(environment, ["version"]);
  assert.equal(ok.code, 0, ok.stderr);
  assert.match(
    ok.stdout,
    new RegExp(`^RKC ${FOUNDATION_VERSION.replaceAll(".", "\\.")} \\(Claude`),
  );
  assert.match(ok.stdout, new RegExp(`Prompt: ${promptVersion}`));
  assert.match(
    ok.stdout,
    /Research notes: .*user-home[\\/]\.rkc-plugin[\\/]temp\n/u,
  );

  await writeJson(join(environment.pluginRoot, ".claude-plugin/plugin.json"), {
    name: "rkc",
    version: "0.0.1",
  });
  const drifted = await run(environment, ["version"]);
  assert.equal(drifted.code, 2);
  assert.match(drifted.stderr, /does not match runtime/u);
});

void test("plugin version rejects a prompt without the declared version", async (context) => {
  const environment = await createPluginEnvironment(context);
  await writeFile(
    join(
      environment.pluginRoot,
      "documentation",
      "RKC-Documentation-Master-Prompt.md",
    ),
    "Prompt version: RKC-DOCS-CREATE-1.0\n",
  );
  const result = await run(environment, ["version"]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /does not declare/u);
});

void test("plugin check-docs reports core results through exit codes", async (context) => {
  const environment = await createPluginEnvironment(context);
  const calls: Array<{ root: string; paths: readonly string[] }> = [];
  const core = (valid: boolean): PluginCoreModule => ({
    checkMarkdownDocumentation: (root, paths) => {
      calls.push({ root, paths });
      return Promise.resolve({
        checked_paths: paths,
        issues: valid ? [] : [{ code: "trailing_whitespace", path: "x.md" }],
        valid,
      });
    },
  });

  const valid = await run(
    environment,
    ["check-docs", environment.repository, "AGENTS.md"],
    core(true),
  );
  assert.equal(valid.code, 0);
  assert.deepEqual(JSON.parse(valid.stdout), {
    checked_paths: ["AGENTS.md"],
    issues: [],
    valid: true,
  });
  const invalid = await run(
    environment,
    ["check-docs", environment.repository, "AGENTS.md", "docs/ai/README.md"],
    core(false),
  );
  assert.equal(invalid.code, 1);
  assert.deepEqual(calls.at(-1), {
    root: environment.repository,
    paths: ["AGENTS.md", "docs/ai/README.md"],
  });

  const missingPaths = await run(
    environment,
    ["check-docs", environment.repository],
    core(true),
  );
  assert.equal(missingPaths.code, 2);
  assert.match(missingPaths.stderr, /Expected check-docs/u);
  const missingRoot = await run(
    environment,
    ["check-docs", join(environment.root, "absent"), "AGENTS.md"],
    core(true),
  );
  assert.equal(missingRoot.code, 2);
  assert.equal(calls.length, 2);
});

void test("plugin research notes use an isolated user-scoped temp root", async (context) => {
  const environment = await createPluginEnvironment(context);
  const started = await run(environment, [
    "research-notes",
    "start",
    environment.repository,
    "test revision",
  ]);
  assert.equal(started.code, 0, started.stderr);
  const runPath = started.stdout.trim();
  assert.equal(
    dirname(runPath),
    await realpath(join(environment.userHome, ".rkc-plugin", "temp")),
  );
  assert.match(
    await readFile(join(runPath, "research.md"), "utf8"),
    /test revision/u,
  );

  const unverified = await run(environment, [
    "research-notes",
    "finish",
    runPath,
    "delete",
  ]);
  assert.equal(unverified.code, 2);
  assert.match(unverified.stderr, /Expected start/u);
  const finished = await run(environment, [
    "research-notes",
    "finish",
    runPath,
    "delete",
    "--verified",
  ]);
  assert.equal(finished.code, 0, finished.stderr);
  assert.equal(finished.stdout, `Removed: ${runPath}\n`);
  await assert.rejects(access(runPath));
});

void test("plugin CLI rejects unknown commands with usage", async (context) => {
  const environment = await createPluginEnvironment(context);
  const result = await run(environment, ["install"]);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /^Usage: rkc\.mjs/u);
});

interface PluginEnvironment {
  pluginRoot: string;
  repository: string;
  root: string;
  userHome: string;
}

async function run(
  environment: PluginEnvironment,
  argv: string[],
  core?: PluginCoreModule,
): Promise<{ code: number; stderr: string; stdout: string }> {
  let stdout = "";
  let stderr = "";
  const code = await runPluginCli({
    argv,
    env: { [TEST_USER_HOME_VARIABLE]: environment.userHome },
    io: {
      stderr: (text) => {
        stderr += text;
      },
      stdout: (text) => {
        stdout += text;
      },
    },
    pluginRoot: environment.pluginRoot,
    ...(core === undefined ? {} : { loadCore: () => Promise.resolve(core) }),
  });
  return { code, stderr, stdout };
}

async function createPluginEnvironment(
  context: TestContext,
): Promise<PluginEnvironment> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "rkc-plugin-cli-")));
  context.after(async () => rm(root, { force: true, recursive: true }));
  const userHome = join(root, "user-home");
  const repository = join(root, "repository");
  const pluginRoot = join(root, "plugin");
  await Promise.all([
    mkdir(userHome, { recursive: true }),
    mkdir(repository, { recursive: true }),
    mkdir(join(pluginRoot, ".claude-plugin"), { recursive: true }),
    mkdir(join(pluginRoot, "documentation"), { recursive: true }),
  ]);
  await writeJson(join(root, TEST_ROOT_MARKER), { root });
  await writeJson(join(pluginRoot, ".claude-plugin", "plugin.json"), {
    name: "rkc",
    version: FOUNDATION_VERSION,
  });
  await writeJson(join(pluginRoot, "core-manifest.json"), {
    format_version: 1,
    package_name: BOOTSTRAP_PACKAGE_NAME,
    distribution: "claude-code-plugin",
    version: FOUNDATION_VERSION,
    core_package: "runtime/core",
    plugin_entry: "scripts/rkc.mjs",
    self_description_manifest: "self-description-manifest.json",
    documentation_master_prompt:
      "documentation/RKC-Documentation-Master-Prompt.md",
    documentation_prompt_version: promptVersion,
  });
  await writeFile(
    join(pluginRoot, "documentation", "RKC-Documentation-Master-Prompt.md"),
    `# Prompt\n\n\`\`\`text\nPrompt version: ${promptVersion}\n\`\`\`\n`,
  );
  await writeJson(join(pluginRoot, "self-description-manifest.json"), {
    format_version: 1,
    distribution_version: FOUNDATION_VERSION,
    documentation_prompt_version: promptVersion,
    provider_specific_instruction_files: false,
  });
  for (const skill of PLUGIN_SKILLS) {
    await mkdir(join(pluginRoot, "skills", skill), { recursive: true });
    await writeFile(join(pluginRoot, "skills", skill, "SKILL.md"), "# Skill\n");
  }
  return { pluginRoot, repository, root, userHome };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
