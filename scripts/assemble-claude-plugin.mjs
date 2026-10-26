import { resolve } from "node:path";

import {
  buildClaudePluginFiles,
  PLUGIN_DIRECTORY,
  writeClaudePlugin,
} from "./claude-plugin-files.mjs";

const root = resolve(".");
const files = await buildClaudePluginFiles(root);
await writeClaudePlugin(root, files);
process.stdout.write(
  `Generated ${PLUGIN_DIRECTORY} (${files.size} files). Commit it with the source change.\n`,
);
