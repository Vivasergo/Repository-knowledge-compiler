// Research-notes contract shared by the npm installation and the Claude Code
// plugin E2E tests. Uses only Node built-ins so it can run against the
// committed plugin without npm ci.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  access,
  readFile,
  readdir,
  realpath,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";

// runNotes(args, cwd = repositoryA) must reject when the helper exits non-zero.
// repositoryB must contain sentinel.txt with "unchanged\n"; foreignPath is an
// existing directory that is not an owned research run.
export async function assertResearchNotesContract({
  foreignPath,
  repositoryA,
  repositoryB,
  runNotes,
  userHome,
}) {
  const started = await Promise.all([
    runNotes(["start", repositoryA, "test revision A"]),
    runNotes(["start", repositoryB, "test revision B"]),
  ]);
  const firstRun = started[0].stdout.trim();
  const secondRun = started[1].stdout.trim();
  assert.notEqual(firstRun, secondRun, "Concurrent runs must not share notes.");
  // The helper returns a canonical path; Windows TEMP may use an 8.3 alias.
  const expectedNotesRoot = await realpath(join(userHome, ".rkc", "temp"));
  for (const run of [firstRun, secondRun]) {
    assert.equal(dirname(run), expectedNotesRoot);
    assert.match(basename(run), /^create-docs-[A-Za-z0-9]+$/u);
  }
  assert.match(
    await readFile(join(firstRun, "research.md"), "utf8"),
    /test revision A/u,
  );
  const notesBeforeCwdRefusal = await digestTree(firstRun);
  await assert.rejects(
    runNotes(["finish", firstRun, "delete", "--verified"], firstRun),
    /outside the research run; notes were preserved/u,
  );
  assert.equal(
    await digestTree(firstRun),
    notesBeforeCwdRefusal,
    "Cleanup from the run directory must preserve every note for an outside retry.",
  );
  await assert.rejects(
    runNotes(["finish", firstRun, "delete"]),
    /explicit|Expected/u,
  );
  await assert.rejects(
    runNotes(["finish", foreignPath, "delete", "--verified"]),
    /outside an owned/u,
  );
  await assert.rejects(
    runNotes(["start", userHome, "test"]),
    /outside the target/u,
  );
  await writeFile(join(firstRun, "owner-sentinel.txt"), "protected\n");
  await assert.rejects(
    runNotes(["finish", firstRun, "delete", "--verified"]),
    /unexpected files/u,
  );
  assert.equal(
    await readFile(join(firstRun, "owner-sentinel.txt"), "utf8"),
    "protected\n",
  );
  await unlink(join(firstRun, "owner-sentinel.txt"));
  const reviewPath = join(secondRun, "review.md");
  const originalReview = await readFile(reviewPath, "utf8");
  await writeFile(
    reviewPath,
    originalReview.replace(
      "<!-- RKC research workspace:",
      "<!-- Unowned workspace:",
    ),
  );
  await assert.rejects(
    runNotes(["finish", secondRun, "retain", "--verified"]),
    /unowned notes/u,
  );
  await writeFile(reviewPath, originalReview.replace(/\n/gu, "\r\n"));
  if (process.platform !== "win32") {
    const researchPath = join(firstRun, "research.md");
    const originalResearch = await readFile(researchPath, "utf8");
    await unlink(researchPath);
    await symlink(join(repositoryB, "sentinel.txt"), researchPath);
    await assert.rejects(
      runNotes(["finish", firstRun, "delete", "--verified"]),
      /unowned notes/u,
    );
    assert.equal(
      await readFile(join(repositoryB, "sentinel.txt"), "utf8"),
      "unchanged\n",
    );
    await unlink(researchPath);
    await writeFile(researchPath, originalResearch);
  }
  await runNotes(["finish", secondRun, "retain", "--verified"]);
  await runNotes(["finish", firstRun, "delete", "--verified"]);
  await assert.rejects(access(firstRun));
  for (const note of ["research.md", "review.md", "transfer.md"]) {
    await access(join(secondRun, note));
  }
}

export async function digestTree(root, options = {}) {
  const base = resolve(root);
  const hash = createHash("sha256");
  await walk(base);
  return hash.digest("hex");

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const relativePath = relative(base, path).replaceAll("\\", "/");
      if (
        options.excludeProjectState === true &&
        (relativePath === ".gitignore" ||
          relativePath === ".rkc" ||
          relativePath.startsWith(".rkc/"))
      ) {
        continue;
      }
      hash.update(`${entry.isDirectory() ? "d" : "f"}:${relativePath}\n`);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        hash.update(await readFile(path));
      } else {
        throw new Error(`Unsupported E2E fixture entry: ${path}`);
      }
    }
  }
}
