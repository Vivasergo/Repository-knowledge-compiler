#!/usr/bin/env node
// Entry of the RKC Claude Code plugin helpers (plugins/rkc/scripts/rkc.mjs).
// Source: scripts/claude-plugin-entry.mjs, copied unchanged by
// scripts/assemble-claude-plugin.mjs. The runtime path resolves only inside
// the generated plugin.
import process from "node:process";
import { fileURLToPath } from "node:url";

const minimumNodeMajor = 22;
const nodeMajor = Number(process.versions.node.split(".")[0]);

if (!(nodeMajor >= minimumNodeMajor)) {
  process.stderr.write(
    `RKC plugin helpers require Node.js ${minimumNodeMajor} or later; found ${process.versions.node}.\n`,
  );
  process.exitCode = 2;
} else {
  const { runPluginCli } = await import("../runtime/bootstrap/plugin-cli.js");
  process.exitCode = await runPluginCli({
    argv: process.argv.slice(2),
    io: {
      stderr: (text) => process.stderr.write(text),
      stdout: (text) => process.stdout.write(text),
    },
    pluginRoot: fileURLToPath(new URL("..", import.meta.url)),
  });
}
