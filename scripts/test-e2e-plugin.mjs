// E2E test of the committed Claude Code plugin. It copies plugins/rkc outside
// the repository, as Claude Code does into its plugin cache, and runs the copy.
// It imports nothing from dist/ or node_modules/, so it also runs without npm ci
// on any supported Node.js version.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  assertResearchNotesContract,
  digestTree,
} from "./e2e-research-notes-contract.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(".");
const marketplace = JSON.parse(
  await readFile(
    join(repositoryRoot, ".claude-plugin/marketplace.json"),
    "utf8",
  ),
);
assert.equal(marketplace.plugins.length, 1);
const entry = marketplace.plugins[0];
const committedPlugin = join(repositoryRoot, entry.source);
const manifest = JSON.parse(
  await readFile(join(committedPlugin, ".claude-plugin/plugin.json"), "utf8"),
);
assert.equal(manifest.name, entry.name);

const root = await realpath(await mkdtemp(join(tmpdir(), "rkc-e2e-plugin-")));
try {
  const userHome = join(root, "user-home");
  const repositories = join(root, "repositories");
  const repositoryA = join(repositories, "repository-a");
  const repositoryB = join(repositories, "repository-b");
  const docsRepository = join(root, "docs-repository");
  const pluginRoot = join(
    root,
    "cache",
    marketplace.name,
    manifest.name,
    manifest.version,
  );
  await Promise.all([
    mkdir(userHome, { recursive: true }),
    mkdir(repositoryA, { recursive: true }),
    mkdir(repositoryB, { recursive: true }),
    mkdir(join(docsRepository, "docs", "ai", "flows"), { recursive: true }),
  ]);
  await cp(committedPlugin, pluginRoot, { recursive: true });
  const { TEST_ROOT_MARKER, TEST_USER_HOME_VARIABLE } = await import(
    pathToFileURL(join(pluginRoot, "runtime", "bootstrap", "lifecycle.js")).href
  );
  await writeFile(
    join(root, TEST_ROOT_MARKER),
    `${JSON.stringify({ root }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(repositoryA, "package.json"),
    '{"name":"plugin-sentinel","private":true}\n',
    "utf8",
  );
  await writeFile(join(repositoryB, "sentinel.txt"), "unchanged\n", "utf8");
  const pluginDigest = await digestTree(pluginRoot);
  const repositoryDigest = await digestTree(repositories);

  const helper = join(pluginRoot, "scripts", "rkc.mjs");
  const runPlugin = (args, cwd = repositoryA) =>
    execFileAsync(process.execPath, [helper, ...args], {
      cwd,
      env: { ...process.env, [TEST_USER_HOME_VARIABLE]: userHome },
    });
  const outcome = async (args, cwd) => {
    try {
      return { code: 0, ...(await runPlugin(args, cwd)) };
    } catch (error) {
      return { code: error.code, stderr: error.stderr, stdout: error.stdout };
    }
  };

  const coreManifest = JSON.parse(
    await readFile(join(pluginRoot, "core-manifest.json"), "utf8"),
  );
  const version = await runPlugin(["version"]);
  assert.equal(
    version.stdout,
    [
      `RKC ${manifest.version} (Claude Code plugin)`,
      `Prompt: ${coreManifest.documentation_prompt_version}`,
      `Plugin root: ${pluginRoot}`,
      `Research notes: ${join(userHome, ".rkc-plugin", "temp")}`,
      "",
    ].join("\n"),
  );
  assert.equal(version.stderr, "");

  await writeFile(
    join(docsRepository, "AGENTS.md"),
    "# Agents\n\nRead [the router](docs/ai/README.md).\n",
    "utf8",
  );
  await writeFile(
    join(docsRepository, "docs", "ai", "README.md"),
    "# Router\n\n- [Checkout flow](flows/checkout.md)\n",
    "utf8",
  );
  await writeFile(
    join(docsRepository, "docs", "ai", "flows", "checkout.md"),
    "# Checkout\n\nRead this when changing checkout.\n\nSkip this when styling.\n",
    "utf8",
  );
  const valid = await runPlugin(
    [
      "check-docs",
      docsRepository,
      "AGENTS.md",
      "docs/ai/README.md",
      "docs/ai/flows/checkout.md",
    ],
    docsRepository,
  );
  assert.deepEqual(JSON.parse(valid.stdout), {
    checked_paths: [
      "AGENTS.md",
      "docs/ai/README.md",
      "docs/ai/flows/checkout.md",
    ],
    issues: [],
    valid: true,
  });

  await writeFile(
    join(docsRepository, "docs", "ai", "flows", "broken.md"),
    "# Broken \r\n\nSee [missing](../missing.md).\n",
    "utf8",
  );
  const invalid = await outcome(
    ["check-docs", docsRepository, "docs/ai/flows/broken.md"],
    docsRepository,
  );
  assert.equal(invalid.code, 1);
  assert.deepEqual(
    JSON.parse(invalid.stdout)
      .issues.map((issue) => issue.code)
      .sort(),
    [
      "broken_relative_link",
      "missing_read_signal",
      "missing_skip_signal",
      "mixed_line_endings",
      "trailing_whitespace",
    ],
  );
  const usage = await outcome(["check-docs", docsRepository], docsRepository);
  assert.equal(usage.code, 2);
  assert.match(usage.stderr, /Expected check-docs/u);

  await assertResearchNotesContract({
    foreignPath: pluginRoot,
    repositoryA,
    repositoryB,
    runNotes: (args, cwd) => runPlugin(["research-notes", ...args], cwd),
    userHome,
    storageDirectory: ".rkc-plugin",
  });

  // Every helper command named by the plugin's skills and references must be
  // recognized by the CLI, and SKILL.md substitution must leave no variables.
  const commands = new Set();
  for (const skill of await readdir(join(pluginRoot, "skills"))) {
    const skillRoot = join(pluginRoot, "skills", skill);
    const instructions = await readFile(join(skillRoot, "SKILL.md"), "utf8");
    assert.match(instructions, new RegExp(`^---\\nname: ${skill}\\n`, "u"));
    assert.match(instructions, /\ndescription: \S/u);
    const substituted = instructions.replaceAll(
      "${CLAUDE_PLUGIN_ROOT}",
      pluginRoot,
    );
    assert.doesNotMatch(substituted, /\$\{/u);
    for (const text of [substituted, ...(await readReferences(skillRoot))]) {
      for (const match of text.matchAll(
        /node "<plugin-root>\/scripts\/rkc\.mjs" ([a-z-]+)/gu,
      )) {
        commands.add(match[1]);
      }
    }
  }
  assert.deepEqual([...commands].sort(), [
    "check-docs",
    "research-notes",
    "version",
  ]);
  for (const command of commands) {
    const result = await outcome(
      command === "version" ? [command, "--unexpected"] : [command],
    );
    assert.equal(result.code, 2);
    assert.doesNotMatch(result.stderr, /^Usage:/u, command);
  }
  assert.match((await outcome(["install"])).stderr, /^Usage:/u);

  assert.deepEqual(await readdir(userHome), [".rkc-plugin"]);
  // A plugin-only run must not create or depend on the npm installation root.
  assert.deepEqual(await readdir(join(userHome, ".rkc-plugin")), ["temp"]);
  assert.equal(await digestTree(pluginRoot), pluginDigest);
  assert.equal(await digestTree(repositories), repositoryDigest);

  process.stdout.write(
    `Claude Code plugin E2E passed: ${manifest.name} ${manifest.version} on Node.js ${process.versions.node}\n`,
  );
} finally {
  await rm(root, {
    force: true,
    maxRetries: 10,
    recursive: true,
    retryDelay: 100,
  });
}

async function readReferences(skillRoot) {
  const references = join(skillRoot, "references");
  let names;
  try {
    names = await readdir(references);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(
    names.map((name) => readFile(join(references, name), "utf8")),
  );
}
