import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";

import { checkMarkdownDocumentation } from "./markdown-checks.js";
void test("checks local Markdown links and topical reading signals", async (context) => {
  const repository = await createRepository(context);
  await mkdir(join(repository, "docs", "ai", "flows"), { recursive: true });
  await writeFile(
    join(repository, "docs", "ai", "README.md"),
    "# Router\n\n[Save flow](flows/save.md)\n",
    "utf8",
  );
  await writeFile(
    join(repository, "docs", "ai", "flows", "save.md"),
    "# Save\n\nRead this when saving.\n\nSkip this when unrelated.\n",
    "utf8",
  );

  const valid = await checkMarkdownDocumentation(repository, [
    "docs/ai/README.md",
    "docs/ai/flows/save.md",
  ]);
  assert.equal(valid.valid, true);

  await writeFile(
    join(repository, "docs", "ai", "flows", "save.md"),
    "# Save\n\n[Missing](../missing.md)\n",
    "utf8",
  );
  const invalid = await checkMarkdownDocumentation(repository, [
    "docs/ai/flows/save.md",
  ]);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.issues.map((issue) => issue.code).sort(), [
    "broken_relative_link",
    "missing_read_signal",
    "missing_skip_signal",
  ]);

  await writeFile(
    join(repository, "docs", "ai", "flows", "save.md"),
    "# Сохранение\n\nRead this when saving.\n\nSkip this when unrelated.\n\n" +
      "Этот документ намеренно содержит достаточно русского текста, чтобы проверка не приняла явно русскоязычную документацию за английскую. "
        .repeat(3)
        .trimEnd() +
      "\n",
    "utf8",
  );
  const nonEnglish = await checkMarkdownDocumentation(repository, [
    "docs/ai/flows/save.md",
  ]);
  assert.deepEqual(
    nonEnglish.issues.map((issue) => issue.code),
    ["non_english_content"],
  );
});

void test("checks Markdown line endings and trailing whitespace without rejecting CRLF", async (context) => {
  const repository = await createRepository(context);
  await mkdir(join(repository, "docs", "ai", "flows"), { recursive: true });
  const documentPath = join(repository, "docs", "ai", "flows", "save.md");

  await writeFile(
    documentPath,
    "# Save\r\n\r\nRead this when saving.\r\n\r\nSkip this when unrelated.\r\n",
    "utf8",
  );
  const crlf = await checkMarkdownDocumentation(repository, [
    "docs/ai/flows/save.md",
  ]);
  assert.equal(crlf.valid, true);

  await writeFile(
    documentPath,
    "# Save\r\n\r\nRead this when saving.  \n\nSkip this when unrelated.\n",
    "utf8",
  );
  const invalid = await checkMarkdownDocumentation(repository, [
    "docs/ai/flows/save.md",
  ]);
  assert.deepEqual(invalid.issues.map((issue) => issue.code).sort(), [
    "mixed_line_endings",
    "trailing_whitespace",
  ]);
});

async function createRepository(context: TestContext): Promise<string> {
  const repository = await mkdtemp(join(tmpdir(), "rkc-v2-docs-"));
  context.after(async () => rm(repository, { force: true, recursive: true }));
  await writeFile(join(repository, "README.md"), "# Test\n", "utf8");
  return repository;
}
