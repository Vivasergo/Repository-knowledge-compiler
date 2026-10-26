// Builds the Claude Code plugin under plugins/rkc from the canonical skills,
// master prompt and compiled workspaces. Run `npm run build` first.
// Markdown transforms are exact: when canonical text changes, the build fails
// and the transform must be reviewed instead of silently drifting.
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export const PLUGIN_DIRECTORY = "plugins/rkc";
export const MARKETPLACE_MANIFEST = ".claude-plugin/marketplace.json";
export const MARKETPLACE_NAME = "repository-knowledge-compiler";

const skillNames = {
  "rkc-help": "help",
  "rkc-create-docs": "create-docs",
  "rkc-update-docs": "update-docs",
  "rkc-audit-docs": "audit-docs",
};
const bootstrapRuntime = [
  "identity.js",
  "lifecycle.js",
  "research-workspace.js",
  "plugin-cli.js",
];
const helper = 'node "<plugin-root>/scripts/rkc.mjs"';
const checkDocs = `\`${helper} check-docs "<repository-root>" <repository-relative-path>...\``;

const preamble = `## Plugin runtime

This skill runs from the RKC Claude Code plugin. \`<plugin-root>\` is
\`\${CLAUDE_PLUGIN_ROOT}\`, the plugin directory two levels above this skill's
base directory; quote its actual absolute path in commands. Run plugin helpers
(Node.js 22 or later) with
\`${helper} <command>\`.
The plugin has no separate installation metadata or npm self-update: Claude
Code's plugin manager installs, updates, and removes it. The master prompt and
references name operations
\`/rkc-<operation>\`; this plugin invokes them as \`/rkc:<operation>\`. Use that
form in owner-facing messages and in documentation you write.
`;

// Written into the plugin root so agents browsing plugins/rkc see that it is
// generated. Claude Code does not load it as a skill.
const generatedReadme = `# RKC Claude Code plugin (generated)

Do not edit files in this directory. \`npm run build:plugin\` regenerates it
from the RKC repository sources:

- \`skills/\`: the canonical skill templates, adapted by the exact transforms
  in \`scripts/claude-plugin-files.mjs\`;
- \`docs/current/RKC-Documentation-Master-Prompt.md\`: copied unchanged;
- \`packages/core\` and \`packages/bootstrap/src/plugin-cli.ts\`: compiled
  into \`runtime/\`;
- \`scripts/claude-plugin-entry.mjs\`: copied to \`scripts/rkc.mjs\`.

Change those sources, run \`npm run build:plugin\`, and commit both.
\`npm run check\` fails when this directory differs from the generated output.
Installation, team setup, and updates are described in \`plugins/README.md\`
of the RKC repository.
`;

const postOperationStart =
  "After the operation reaches a terminal result, run the installed maintenance";

const markdownTransforms = {
  "rkc-help/SKILL.md": [
    replace(
      "Resolve `installation.json` and the active user-scoped RKC\ncore.",
      `Confirm the active RKC plugin with\n\`${helper} version\`.`,
    ),
    replace(
      "- machine installation and active RKC version;",
      "- plugin installation and active RKC version;",
    ),
    replace(
      "and diagnostics. Network update\nchecks and machine mutation require the explicit corresponding CLI action.",
      `and diagnostics: the output of\n\`${helper} version\` and\n\`<plugin-root>/self-description-manifest.json\`. Claude Code's plugin manager\n(\`/plugin\`) installs, updates, and removes the plugin; do not run those\nactions yourself.`,
    ),
  ],
  "rkc-create-docs/SKILL.md": [
    replace(
      "Resolve the active user-scoped RKC installation from `installation.json` and\nread `core_path` from that metadata, then load the relative\n`documentation_master_prompt` path and `documentation_prompt_version` declared by\n`<core_path>/core-manifest.json`.",
      "Load the relative `documentation_master_prompt` path and\n`documentation_prompt_version` declared by `<plugin-root>/core-manifest.json`.",
    ),
    replace(
      "keep them outside the target repository and installed version tree.",
      "keep them outside the target repository and the plugin directory.",
    ),
    replace(
      "by calling\n`checkMarkdownDocumentation` from the installed core entry.",
      `by running\n${checkDocs}\n(exit 0: valid; exit 1: issues listed in the JSON output).`,
    ),
    removeParagraph(postOperationStart, "change the documentation result."),
  ],
  "rkc-update-docs/SKILL.md": [
    replace(
      "Resolve the active user-scoped RKC installation.",
      "Resolve the RKC plugin runtime at `<plugin-root>`.",
    ),
    replace("with\n`checkMarkdownDocumentation`.", `with\n${checkDocs}.`),
    removeParagraph(
      postOperationStart,
      "a failed check must not change that result.",
    ),
  ],
  "rkc-audit-docs/SKILL.md": [
    replace(
      "Resolve the active user-scoped RKC installation,",
      "Resolve the RKC plugin runtime at `<plugin-root>`,",
    ),
    replace(
      "Call `checkMarkdownDocumentation` from the installed core for the mechanical\nportion;",
      `Run\n${checkDocs}\nfor the mechanical portion;`,
    ),
    removeParagraph(
      postOperationStart,
      "a failed check must not change that result.",
    ),
  ],
  "rkc-create-docs/references/research-checkpoint-experiment.md": [
    replace(
      "run the installed helper with actual\nquoted paths resolved from installation metadata:",
      "run the plugin helper with actual\nquoted paths (`<plugin-root>` as defined by the invoking skill):",
    ),
    replace(
      'node "<core_path>/node_modules/repository-knowledge-compiler/dist/research-notes.js" ',
      `${helper} research-notes `,
      2,
    ),
    replace(
      "`.rkc/temp/create-docs-<run>/` adjacent to user-scoped `versions/`, outside the\ntarget and installed version.",
      "`~/.rkc-plugin/temp/create-docs-<run>/` in the user's home directory, outside the\ntarget and the plugin directory.",
    ),
  ],
};

const operationName =
  /(?<![\w.-])\/?rkc-(help|create-docs|update-docs|audit-docs)\b/gu;
const npmResidue = [
  /installation\.json/u,
  /core_path/u,
  /post-operation/u,
  /checkMarkdownDocumentation/u,
  /node_modules\/repository-knowledge-compiler/u,
  /user-scoped RKC installation/u,
  operationName,
];

export async function buildClaudePluginFiles(root) {
  const files = new Map();
  const add = (path, content) => {
    if (files.has(path)) throw new Error(`Duplicate plugin file: ${path}`);
    files.set(
      path,
      typeof content === "string"
        ? Buffer.from(normalize(content), "utf8")
        : Buffer.from(content),
    );
  };

  const bootstrapPackage = await readJson(
    join(root, "packages", "bootstrap", "package.json"),
  );
  const identity = await importModule(
    join(root, "packages", "bootstrap", "dist", "identity.js"),
  );
  const pluginCli = await importModule(
    join(root, "packages", "bootstrap", "dist", "plugin-cli.js"),
  );
  const core = await importModule(
    join(root, "packages", "core", "dist", "index.js"),
  );
  const version = bootstrapPackage.version;
  if (version !== identity.FOUNDATION_VERSION) {
    throw new Error(
      `Bootstrap version ${version} differs from FOUNDATION_VERSION ${identity.FOUNDATION_VERSION}.`,
    );
  }
  const promptVersion = core.RKC_DOCUMENTATION_PROMPT_VERSION;
  const prompt = await readText(
    join(root, "docs", "current", "RKC-Documentation-Master-Prompt.md"),
  );
  if (!prompt.split("\n").includes(`Prompt version: ${promptVersion}`)) {
    throw new Error(`The master prompt does not declare ${promptVersion}.`);
  }
  const pluginSkills = Object.values(skillNames);
  if (pluginCli.PLUGIN_SKILLS.join("\n") !== pluginSkills.join("\n")) {
    throw new Error("Plugin runtime and generator skill sets differ.");
  }

  add(
    ".claude-plugin/plugin.json",
    json({
      name: pluginCli.PLUGIN_NAME,
      version,
      description: bootstrapPackage.description,
      author: { name: bootstrapPackage.author },
      homepage: bootstrapPackage.homepage,
      repository: bootstrapPackage.repository.url
        .replace(/^git\+/u, "")
        .replace(/\.git$/u, ""),
      license: bootstrapPackage.license,
      keywords: [...bootstrapPackage.keywords, "claude-code-plugin"],
    }),
  );
  add("LICENSE", await readText(join(root, "LICENSE")));
  add("README.md", generatedReadme);
  add(
    "core-manifest.json",
    json({
      format_version: 1,
      package_name: bootstrapPackage.name,
      distribution: "claude-code-plugin",
      version,
      core_package: pluginCli.PLUGIN_CORE_PACKAGE,
      plugin_entry: pluginCli.PLUGIN_ENTRY,
      self_description_manifest: pluginCli.PLUGIN_SELF_DESCRIPTION_MANIFEST,
      documentation_master_prompt: pluginCli.PLUGIN_DOCUMENTATION_MASTER_PROMPT,
      documentation_prompt_version: promptVersion,
    }),
  );
  add(
    pluginCli.PLUGIN_SELF_DESCRIPTION_MANIFEST,
    json(core.createSelfDescriptionManifest(version)),
  );
  // The prompt stays byte-identical so its version identifier is not forked.
  add(pluginCli.PLUGIN_DOCUMENTATION_MASTER_PROMPT, prompt);

  for (const [canonical, pluginSkill] of Object.entries(skillNames)) {
    const skillRoot = join(root, "skills", canonical);
    for (const source of await listFiles(skillRoot)) {
      const relativePath = toPosix(relative(skillRoot, source));
      const key = `${canonical}/${relativePath}`;
      const target = `skills/${pluginSkill}/${relativePath}`;
      if (!source.endsWith(".md")) {
        add(target, await readFile(source));
        continue;
      }
      let text = await readText(source);
      if (relativePath === "SKILL.md") {
        text = replace(`name: ${canonical}\n`, `name: ${pluginSkill}\n`)(
          text,
          key,
        );
      }
      for (const transform of markdownTransforms[key] ?? []) {
        text = transform(text, key);
      }
      text = text.replace(operationName, "/rkc:$1");
      for (const pattern of npmResidue) {
        if (new RegExp(pattern.source, "u").test(text)) {
          throw new Error(
            `${key} still contains npm-installation text matching ${pattern}; add a plugin transform.`,
          );
        }
      }
      if (relativePath === "SKILL.md") text = insertPreamble(text, key);
      add(target, text);
    }
  }
  for (const key of Object.keys(markdownTransforms)) {
    if (!files.has(`skills/${pluginSkillPath(key)}`)) {
      throw new Error(`Transform target ${key} no longer exists.`);
    }
  }

  add("runtime/package.json", json({ private: true, type: "module" }));
  const coreSources = await listFiles(join(root, "packages", "core", "src"));
  for (const source of coreSources) {
    if (!source.endsWith(".ts") || source.endsWith(".test.ts")) continue;
    const relativePath = toPosix(
      relative(join(root, "packages", "core", "src"), source),
    ).replace(/\.ts$/u, ".js");
    add(
      `runtime/core/${relativePath}`,
      await readEmitted(join(root, "packages", "core", "dist", relativePath)),
    );
  }
  for (const name of bootstrapRuntime) {
    add(
      `runtime/bootstrap/${name}`,
      await readEmitted(join(root, "packages", "bootstrap", "dist", name)),
    );
  }
  add(
    pluginCli.PLUGIN_ENTRY,
    await readText(join(root, "scripts", "claude-plugin-entry.mjs")),
  );

  assertPluginFiles(files);
  return new Map([...files.entries()].sort(([a], [b]) => compare(a, b)));
}

export async function writeClaudePlugin(root, files) {
  const target = resolve(root, PLUGIN_DIRECTORY);
  if (target !== resolve(root, "plugins", "rkc")) {
    throw new Error(
      `Refusing to write the plugin outside ${PLUGIN_DIRECTORY}.`,
    );
  }
  await rm(target, { force: true, recursive: true });
  for (const [path, content] of files) {
    const destination = join(target, ...path.split("/"));
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

export async function readPluginTree(directory) {
  const files = new Map();
  for (const path of await listFiles(directory)) {
    files.set(toPosix(relative(directory, path)), await readFile(path));
  }
  return files;
}

function assertPluginFiles(files) {
  for (const path of files.keys()) {
    if (
      path
        .split("/")
        .some((part) => ["node_modules", "dist", "bin"].includes(part))
    ) {
      throw new Error(`Plugin path uses a reserved directory name: ${path}`);
    }
  }
  const relativeImport =
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/gu;
  for (const [path, content] of files) {
    if (!/\.m?js$/u.test(path)) continue;
    for (const match of content.toString("utf8").matchAll(relativeImport)) {
      const specifier = match[1];
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        throw new Error(`${path} imports a bare specifier: ${specifier}`);
      }
      const resolved = posix.normalize(
        posix.join(posix.dirname(path), specifier),
      );
      if (!files.has(resolved)) {
        throw new Error(`${path} imports a missing plugin file: ${specifier}`);
      }
    }
  }
  for (const [path, content] of files) {
    if (!path.endsWith(".md")) continue;
    const text = content.toString("utf8");
    const rootVariables = text.match(/\$\{CLAUDE_PLUGIN_ROOT\}/gu)?.length ?? 0;
    const expected = path.endsWith("/SKILL.md") ? 1 : 0;
    if (path.startsWith("skills/") && rootVariables !== expected) {
      throw new Error(
        `${path} must reference \${CLAUDE_PLUGIN_ROOT} ${expected} time(s); found ${rootVariables}.`,
      );
    }
    for (const match of text.matchAll(/<plugin-root>\/([^\s"`)]+)/gu)) {
      if (!files.has(match[1])) {
        throw new Error(
          `${path} references a missing plugin file: ${match[1]}`,
        );
      }
    }
  }
}

function replace(from, to, expected = 1) {
  return (text, key) => {
    const count = text.split(from).length - 1;
    if (count !== expected) {
      throw new Error(
        `Plugin transform for ${key} expected ${expected} occurrence(s) of ${JSON.stringify(from.slice(0, 80))}, found ${count}. Review the canonical change and update scripts/claude-plugin-files.mjs.`,
      );
    }
    return text.split(from).join(to);
  };
}

function removeParagraph(start, end) {
  return (text, key) => {
    const first = text.indexOf(start);
    if (first === -1 || text.indexOf(start, first + 1) !== -1) {
      throw new Error(
        `Plugin transform for ${key} expected one paragraph starting ${JSON.stringify(start)}.`,
      );
    }
    const last = text.indexOf(end, first);
    const nextBlank = text.indexOf("\n\n", first);
    if (last === -1 || (nextBlank !== -1 && nextBlank < last)) {
      throw new Error(
        `Plugin transform for ${key} expected the paragraph to end with ${JSON.stringify(end)}.`,
      );
    }
    const before = text.slice(0, first).replace(/\n+$/u, "");
    const after = text.slice(last + end.length).replace(/^\n+/u, "");
    return `${before}\n\n${after}`;
  };
}

function insertPreamble(text, key) {
  const heading = /^# .+\n/mu.exec(text);
  if (heading === null) throw new Error(`${key} has no H1 heading.`);
  const index = heading.index + heading[0].length;
  return `${text.slice(0, index)}\n${preamble}${text.slice(index)}`;
}

function pluginSkillPath(key) {
  const [canonical, ...rest] = key.split("/");
  return [skillNames[canonical], ...rest].join("/");
}

async function readEmitted(path) {
  const text = await readText(path);
  return text.replace(/\n\/\/# sourceMappingURL=[^\n]*\n?$/u, "\n");
}

async function readText(path) {
  return normalize(await readFile(path, "utf8"));
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function importModule(path) {
  return import(pathToFileURL(path).href);
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      // Finder metadata is local noise, never plugin content.
      if (entry.name === ".DS_Store") return [];
      if (entry.isDirectory()) return listFiles(path);
      if (entry.isFile()) return [path];
      throw new Error(`Unsupported plugin source entry: ${path}`);
    }),
  );
  return nested.flat();
}

function normalize(text) {
  return text.replace(/\r\n?/gu, "\n");
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function toPosix(path) {
  return path.split(sep).join("/");
}

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
