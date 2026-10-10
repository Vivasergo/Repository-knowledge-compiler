import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { installedContext } from "./lifecycle.js";

const noteNames = ["research.md", "review.md", "transfer.md"] as const;
const flow = "RKC-CREATE-FLOW-BOUNDED-PRESERVATION-PILOT-3";

async function workspaceRoot(
  testUserHome?: string,
  repository?: string,
): Promise<string> {
  const installation = await installedContext(testUserHome);
  const root = join(await realpath(installation.rkc_root), "temp");
  if (repository !== undefined) {
    const distance = relative(repository, root);
    if (
      distance === "" ||
      (distance !== ".." &&
        !distance.startsWith(`..${sep}`) &&
        !isAbsolute(distance))
    ) {
      throw new Error("Research notes must be outside the target repository.");
    }
  }
  await mkdir(root, { recursive: true, mode: 0o700 });
  if ((await lstat(root)).isSymbolicLink()) {
    throw new Error("RKC temporary storage must not be a symbolic link.");
  }
  return realpath(root);
}

function marker(run: string): string {
  return `<!-- RKC research workspace: ${basename(run)} -->`;
}

export async function startResearchWorkspace(options: {
  repository: string;
  revision: string;
  testUserHome?: string;
}): Promise<string> {
  const repository = await realpath(options.repository);
  if (!(await lstat(repository)).isDirectory() || !options.revision.trim()) {
    throw new Error(
      "A repository directory and checked revision are required.",
    );
  }
  const root = await workspaceRoot(options.testUserHome, repository);
  const run = await mkdtemp(join(root, "create-docs-"));
  const provenance = `${marker(run)}\n\nRepository: ${JSON.stringify(repository)}\nRevision: ${JSON.stringify(options.revision)}\nFlow: ${flow}\nCreated: ${new Date().toISOString()}\n\nStatus: started; not semantically verified.\n`;
  const sections = {
    "research.md":
      "# Research\n\n## Coverage map\n\n## Original findings by area\n\n## Excluded and unchecked scope\n",
    "review.md":
      "# Reviews\n\n## Original research reviews\n\n## Verified corrections and research readiness\n\n## Seam checks\n\n## Original accuracy QA\n\n## Original task-usefulness QA\n\n## Final corrections and checks\n",
    "transfer.md":
      "# Transfer\n\n## Finding dispositions\n\n## Passage rechecks after assembly and QA\n\n## Completion\n",
  };
  for (const name of noteNames) {
    await writeFile(join(run, name), `${provenance}\n${sections[name]}`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
  }
  return run;
}

// This manages files only. The caller must establish semantic completion.
export async function finishResearchWorkspace(options: {
  run: string;
  disposition: "retain" | "delete";
  verified: boolean;
  testUserHome?: string;
}): Promise<string> {
  if (!options.verified)
    throw new Error("Completion requires explicit verified status.");
  const root = await workspaceRoot(options.testUserHome);
  const run = resolve(options.run);
  if (
    dirname(run) !== root ||
    !/^create-docs-[A-Za-z0-9]+$/u.test(basename(run))
  ) {
    throw new Error("Refusing a path outside an owned research run.");
  }
  if ((await lstat(run)).isSymbolicLink() || (await realpath(run)) !== run) {
    throw new Error("Research run must not be a symbolic link.");
  }
  const names = await readdir(run);
  if (
    names.length !== noteNames.length ||
    names.some((name) => !noteNames.some((expected) => name === expected))
  ) {
    throw new Error(
      "Refusing cleanup of incomplete notes or unexpected files.",
    );
  }
  for (const name of noteNames) {
    const file = join(run, name);
    if (
      !(await lstat(file)).isFile() ||
      (await readFile(file, "utf8")).split(/\r?\n/u, 1)[0] !== marker(run)
    ) {
      throw new Error("Refusing unowned notes or symbolic links.");
    }
  }
  if (options.disposition === "delete") {
    // No recursive removal: unexpected children and sibling runs are protected.
    for (const name of noteNames) await unlink(join(run, name));
    await rmdir(run);
  }
  return `${options.disposition === "retain" ? "Retained" : "Removed"}: ${run}`;
}
