import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(".");
const bootstrapDirectory = join(root, "packages", "bootstrap");
const payloadDirectory = join(bootstrapDirectory, "payload");
const runtimeModulesDirectory = join(payloadDirectory, "node_modules");

const bootstrapPackage = await readJson(
  join(bootstrapDirectory, "package.json"),
);

await rm(payloadDirectory, { force: true, recursive: true });
await mkdir(runtimeModulesDirectory, { recursive: true });

await copyWorkspacePackage(
  join(root, "packages", "core"),
  join(runtimeModulesDirectory, "@rkc", "core"),
  ["dist", "package.json"],
);
await copyInstalledHostBoundaryRuntime();
await mkdir(join(payloadDirectory, "documentation"), { recursive: true });
await cp(
  join(root, "docs", "current", "RKC-Documentation-Master-Prompt.md"),
  join(payloadDirectory, "documentation", "RKC-Documentation-Master-Prompt.md"),
);

for (const skill of [
  "rkc-help",
  "rkc-create-docs",
  "rkc-update-docs",
  "rkc-audit-docs",
]) {
  await cp(
    join(root, "skills", skill),
    join(payloadDirectory, "skills", skill),
    {
      recursive: true,
    },
  );
}

const coreModule = await import(
  pathToFileURL(join(root, "packages", "core", "dist", "index.js")).href
);
if (typeof coreModule.createSelfDescriptionManifest !== "function") {
  throw new Error("Built core has no self-description manifest capability.");
}
const selfDescriptionManifest = coreModule.createSelfDescriptionManifest(
  bootstrapPackage.version,
);
await writeFile(
  join(payloadDirectory, "self-description-manifest.json"),
  `${JSON.stringify(selfDescriptionManifest, null, 2)}\n`,
  "utf8",
);

await writeFile(
  join(payloadDirectory, "payload-manifest.json"),
  `${JSON.stringify(
    {
      format_version: 1,
      package_name: bootstrapPackage.name,
      version: bootstrapPackage.version,
      core_package: "node_modules/@rkc/core",
      host_boundary_entry: `node_modules/${bootstrapPackage.name}/dist/maintenance.js`,
      self_description_manifest: "self-description-manifest.json",
      documentation_master_prompt:
        "documentation/RKC-Documentation-Master-Prompt.md",
      documentation_prompt_version: "RKC-DOCS-CREATE-2.14",
      skills: [
        "rkc-help",
        "rkc-create-docs",
        "rkc-update-docs",
        "rkc-audit-docs",
      ],
    },
    null,
    2,
  )}\n`,
  "utf8",
);

async function copyWorkspacePackage(source, target, entries) {
  await mkdir(target, { recursive: true });
  for (const entry of entries) {
    await cp(join(source, entry), join(target, entry), {
      filter: (candidate) => isRuntimeWorkspacePath(candidate),
      recursive: true,
    });
  }
}

async function copyInstalledHostBoundaryRuntime() {
  const target = join(runtimeModulesDirectory, bootstrapPackage.name);
  await mkdir(join(target, "dist"), { recursive: true });
  for (const entry of [
    "identity.js",
    "lifecycle.js",
    "maintenance.js",
    "post-operation.js",
  ]) {
    await cp(
      join(bootstrapDirectory, "dist", entry),
      join(target, "dist", entry),
    );
  }
  await writeFile(
    join(target, "package.json"),
    `${JSON.stringify(
      {
        name: bootstrapPackage.name,
        version: bootstrapPackage.version,
        type: "module",
        private: true,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function isRuntimeWorkspacePath(candidate) {
  const name = basename(candidate);
  return name !== ".tsbuildinfo" && !name.includes(".test.");
}
