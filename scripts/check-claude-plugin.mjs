import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  buildClaudePluginFiles,
  MARKETPLACE_MANIFEST,
  MARKETPLACE_NAME,
  PLUGIN_DIRECTORY,
  readPluginTree,
} from "./claude-plugin-files.mjs";

const root = resolve(".");
const expected = await buildClaudePluginFiles(root);
const actual = await readPluginTree(join(root, PLUGIN_DIRECTORY));
const differences = [];
for (const [path, content] of expected) {
  const committed = actual.get(path);
  if (committed === undefined) differences.push(`missing: ${path}`);
  else if (!committed.equals(content)) differences.push(`changed: ${path}`);
}
for (const path of actual.keys()) {
  if (!expected.has(path)) differences.push(`unexpected: ${path}`);
}
if (differences.length > 0) {
  throw new Error(
    `${PLUGIN_DIRECTORY} is out of sync with its sources. Run npm run build:plugin and commit the result.\n${differences.join("\n")}`,
  );
}

const marketplace = JSON.parse(
  await readFile(join(root, MARKETPLACE_MANIFEST), "utf8"),
);
const plugin = JSON.parse(
  expected.get(".claude-plugin/plugin.json").toString("utf8"),
);
const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
if (
  marketplace.name !== MARKETPLACE_NAME ||
  typeof marketplace.owner?.name !== "string" ||
  entries.length !== 1 ||
  entries[0].name !== plugin.name ||
  entries[0].source !== `./${PLUGIN_DIRECTORY}` ||
  "version" in entries[0]
) {
  throw new Error(
    `${MARKETPLACE_MANIFEST} must list only ${plugin.name} from ./${PLUGIN_DIRECTORY}, without a version (plugin.json owns it).`,
  );
}

process.stdout.write(
  `${PLUGIN_DIRECTORY} matches its sources (${expected.size} files); ${MARKETPLACE_MANIFEST} is valid.\n`,
);
