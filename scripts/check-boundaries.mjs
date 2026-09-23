import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const root = resolve(".");
const expectedWorkspaces = ["bootstrap", "core"];
const expectedSkills = [
  "rkc-help",
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
];
const expectedCoreBoundaries = [
  "mechanics",
  "self-description",
  "lifecycle",
  "documentation",
];
const allowedInternalDependencies = {
  bootstrap: new Set(),
  core: new Set(),
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function requireDirectory(path) {
  if (!(await stat(path)).isDirectory()) {
    throw new Error(`Expected directory: ${relative(root, path)}`);
  }
}

const rootPackage = await readJson(join(root, "package.json"));
assertEqualList(
  rootPackage.workspaces,
  expectedWorkspaces.map((name) => `packages/${name}`),
  "root workspaces",
);

for (const name of expectedWorkspaces) {
  const packageDirectory = join(root, "packages", name);
  await requireDirectory(packageDirectory);
  const packageJson = await readJson(join(packageDirectory, "package.json"));
  const shouldBePrivate = name !== "bootstrap";
  if (shouldBePrivate && packageJson.private !== true) {
    throw new Error(`${packageJson.name} must remain private.`);
  }
  if (
    !shouldBePrivate &&
    packageJson.name !== "repository-knowledge-compiler"
  ) {
    throw new Error(
      "The public bootstrap package name does not match the V2 package contract.",
    );
  }

  const dependencyGroups = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.optionalDependencies,
    packageJson.peerDependencies,
  ];
  const internalDependencies = dependencyGroups
    .filter((group) => typeof group === "object" && group !== null)
    .flatMap((group) => Object.keys(group))
    .filter(
      (dependency) =>
        dependency.startsWith("@rkc/") ||
        dependency === "repository-knowledge-compiler",
    );
  for (const dependency of internalDependencies) {
    if (!allowedInternalDependencies[name].has(dependency)) {
      throw new Error(`${packageJson.name} may not depend on ${dependency}.`);
    }
  }

  if (name === "bootstrap") {
    if (packageJson.bin?.rkc !== "./dist/cli.js") {
      throw new Error("The sole executable must be rkc at ./dist/cli.js.");
    }
    const payload = packageJson.files ?? [];
    if (
      payload.some(
        (path) => path.includes("test") || path.includes(".tsbuildinfo"),
      )
    ) {
      throw new Error(
        "Bootstrap payload may not include tests or build metadata.",
      );
    }
  }
}

for (const skill of expectedSkills) {
  await requireDirectory(join(root, "skills", skill));
}
for (const boundary of expectedCoreBoundaries) {
  await requireDirectory(join(root, "packages", "core", "src", boundary));
}

const sourceFiles = await collectFiles(join(root, "packages"), ".ts");
for (const sourceFile of sourceFiles) {
  const content = await readFile(sourceFile, "utf8");
  if (/from\s+["'][^"']*packages[\\/]/u.test(content)) {
    throw new Error(
      `Cross-workspace source-path import is forbidden: ${relative(root, sourceFile)}`,
    );
  }
}

process.stdout.write(
  "Workspace, skill, and core ownership boundaries are valid.\n",
);

function assertEqualList(actual, expected, label) {
  if (!Array.isArray(actual) || actual.join("\n") !== expected.join("\n")) {
    throw new Error(`Unexpected ${label}.`);
  }
}

async function collectFiles(directory, suffix) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory() && entry.name !== "dist") {
        return collectFiles(path, suffix);
      }
      return entry.isFile() && entry.name.endsWith(suffix) ? [path] : [];
    }),
  );
  return nested.flat();
}
