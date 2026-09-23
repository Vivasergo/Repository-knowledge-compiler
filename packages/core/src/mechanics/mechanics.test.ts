import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AtomicWriteError,
  captureRepositoryMutationBoundary,
  checkMarkdownLinks,
  compareDocuments,
  discoverRepositoryRoot,
  inventoryRepository,
  redactStructured,
  validateRepositoryMutationBoundary,
  writeJsonAtomically,
} from "./index.js";

void test("discovers and inventories a repository safely", async () => {
  await withTemporaryDirectory(async (repository) => {
    await writeFile(join(repository, "package.json"), "{}\n");
    await writeFile(join(repository, ".env"), "TOKEN=hidden\n");
    await mkdir(join(repository, "src"));
    await writeFile(join(repository, "src", "index.js"), "export {};\n");
    await mkdir(join(repository, "node_modules"));
    await writeFile(join(repository, "node_modules", "vendor.js"), "x\n");

    const root = await discoverRepositoryRoot(join(repository, "src"));
    const inventory = await inventoryRepository(repository);
    const classes = new Map(
      inventory.entries.map((entry) => [entry.path, entry.classification]),
    );
    assert.equal(root.root, repository);
    assert.equal(root.marker, "package.json");
    assert.equal(classes.get(".env"), "sensitive");
    assert.equal(classes.get("src/index.js"), "eligible");
    assert.equal(classes.get("node_modules/"), "vendor");
  });
});

void test("atomic JSON writes clean up an interrupted temporary file", async () => {
  await withTemporaryDirectory(async (repository) => {
    const destination = join(repository, "result.json");
    const result = await writeJsonAtomically(destination, { status: "ready" });
    assert.equal(result.redaction_state, "none");
    assert.deepEqual(JSON.parse(await readFile(destination, "utf8")), {
      status: "ready",
    });
    await assert.rejects(
      writeJsonAtomically(
        destination,
        { status: "never-committed" },
        {
          before_commit: () => {
            throw new Error("interrupted");
          },
        },
      ),
      AtomicWriteError,
    );
    assert.deepEqual(JSON.parse(await readFile(destination, "utf8")), {
      status: "ready",
    });
  });
});

void test("detects protected repository mutations", async () => {
  await withTemporaryDirectory(async (repository) => {
    await writeFile(join(repository, "README.md"), "before\n");
    await mkdir(join(repository, "docs"));
    await writeFile(join(repository, "docs", "ai.md"), "allowed\n");
    const before = await captureRepositoryMutationBoundary(repository, [
      "docs/ai.md",
    ]);
    await writeFile(join(repository, "README.md"), "after\n");
    await writeFile(join(repository, "docs", "ai.md"), "changed\n");
    assert.deepEqual(await validateRepositoryMutationBoundary(before), [
      "README.md",
    ]);
  });
});

void test("checks links, document changes, and redaction", async () => {
  await withTemporaryDirectory(async (repository) => {
    await mkdir(join(repository, "docs"));
    await writeFile(join(repository, "docs", "target.md"), "target\n");
    const links = await checkMarkdownLinks(
      repository,
      "README.md",
      "[ok](docs/target.md) [missing](docs/missing.md) [web](https://example.com)",
    );
    assert.deepEqual(
      links.map((entry) => entry.status),
      ["exists", "missing", "external"],
    );
    assert.equal(compareDocuments("before\n", "after\n").changed, true);
    const redacted = redactStructured({ api_key: "secret", name: "safe" });
    assert.equal(redacted.state, "redacted");
    assert.deepEqual(redacted.value, {
      api_key: "[REDACTED]",
      name: "safe",
    });
  });
});

async function withTemporaryDirectory(
  action: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "rkc-mechanics-"));
  try {
    await action(directory);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
}
