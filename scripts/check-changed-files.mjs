import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawn } from "node:child_process";

const files = [...new Set(process.argv.slice(2).map((file) => resolve(file)))];
if (files.length === 0) {
  throw new Error("Pass one or more changed repository-relative file paths.");
}

await Promise.all(files.map((file) => access(file)));
const formatted = files.filter((file) =>
  new Set([".json", ".js", ".mjs", ".ts", ".md", ".yml", ".yaml"]).has(
    extname(file),
  ),
);
if (formatted.length > 0) {
  await run(process.execPath, [
    resolve("node_modules/prettier/bin/prettier.cjs"),
    "--check",
    ...formatted,
  ]);
}

for (const file of files.filter((path) => extname(path) === ".json")) {
  JSON.parse(await readFile(file, "utf8"));
}
for (const file of files.filter((path) =>
  [".js", ".mjs"].includes(extname(path)),
)) {
  await run(process.execPath, ["--check", file]);
}
if (files.some((file) => extname(file) === ".ts")) {
  await run(process.execPath, [
    resolve("node_modules/typescript/bin/tsc"),
    "-b",
    "--pretty",
    "false",
  ]);
}
process.stdout.write(
  `Changed-file preflight passed for ${files.length} file(s).\n`,
);

async function run(command, arguments_) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0 && signal === null) resolvePromise();
      else
        reject(
          new Error(`${command} failed with ${signal ?? `exit code ${code}`}.`),
        );
    });
  });
}
