import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(".");
const ignoredDirectories = new Set([
  ".git",
  ".npm-cache",
  "dist",
  "library-verify",
  "node_modules",
  "upload",
]);
const textExtensions = new Set([
  "",
  ".cjs",
  ".json",
  ".js",
  ".md",
  ".mjs",
  ".ts",
  ".yaml",
  ".yml",
]);
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /AKIA[0-9A-Z]{16}/u,
  /gh[pousr]_[A-Za-z0-9]{30,}/u,
  /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/u,
];

const findings = [];
for (const path of await collectFiles(root)) {
  if (!textExtensions.has(extname(path))) continue;
  if ((await stat(path)).size > 1_000_000) continue;
  const content = await readFile(path, "utf8");
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    findings.push(relative(root, path));
  }
}

if (findings.length > 0) {
  throw new Error(`Potential secret material found in: ${findings.join(", ")}`);
}

process.stdout.write("No high-confidence secret patterns found.\n");

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) return [];
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectFiles(path);
      return entry.isFile() ? [path] : [];
    }),
  );
  return nested.flat();
}
