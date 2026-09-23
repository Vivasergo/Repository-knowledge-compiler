import { createHash } from "node:crypto";
import { lstat, realpath } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

export interface PathCheckResult {
  readonly path: string;
  readonly status: "exists" | "missing" | "outside_repository";
}

export interface LinkCheckResult {
  readonly target: string;
  readonly status:
    "exists" | "missing" | "outside_repository" | "external" | "anchor";
}

export interface DocumentComparison {
  readonly changed: boolean;
  readonly before_digest: string;
  readonly after_digest: string;
  readonly removed_lines: readonly string[];
  readonly added_lines: readonly string[];
}

export async function checkRepositoryPath(
  repositoryRoot: string,
  relativePath: string,
): Promise<PathCheckResult> {
  if (isAbsolute(relativePath)) {
    return { path: relativePath, status: "outside_repository" };
  }
  const root = await realpath(repositoryRoot);
  const candidate = resolve(root, relativePath);
  if (!within(root, candidate)) {
    return { path: relativePath, status: "outside_repository" };
  }
  try {
    await lstat(candidate);
    const resolved = await realpath(candidate);
    return {
      path: relativePath,
      status: within(root, resolved) ? "exists" : "outside_repository",
    };
  } catch (error) {
    if (isMissing(error)) return { path: relativePath, status: "missing" };
    throw error;
  }
}

export async function checkMarkdownLinks(
  repositoryRoot: string,
  documentPath: string,
  markdown: string,
): Promise<readonly LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
  for (const match of markdown.matchAll(linkPattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const target = normalizeMarkdownTarget(raw);
    if (/^(?:https?:|mailto:|tel:)/iu.test(target)) {
      results.push({ target, status: "external" });
      continue;
    }
    if (target.startsWith("#")) {
      results.push({ target, status: "anchor" });
      continue;
    }
    const withoutAnchor = target.split("#", 1)[0] ?? "";
    let decoded: string;
    try {
      decoded = decodeURIComponent(withoutAnchor);
    } catch {
      results.push({ target, status: "missing" });
      continue;
    }
    const candidate = relative(
      resolve(repositoryRoot),
      resolve(repositoryRoot, dirname(documentPath), decoded),
    );
    const checked = await checkRepositoryPath(repositoryRoot, candidate);
    results.push({ target, status: checked.status });
  }
  return results;
}

export function compareDocuments(
  before: string,
  after: string,
): DocumentComparison {
  const beforeLines = before.split(/\r?\n/u);
  const afterLines = after.split(/\r?\n/u);
  return {
    changed: before !== after,
    before_digest: digest(before),
    after_digest: digest(after),
    removed_lines: subtractLineCounts(beforeLines, countLines(afterLines)),
    added_lines: subtractLineCounts(afterLines, countLines(beforeLines)),
  };
}

function normalizeMarkdownTarget(raw: string): string {
  if (raw.startsWith("<")) {
    const close = raw.indexOf(">");
    if (close >= 0) return raw.slice(1, close);
  }
  return raw.split(/\s+["'(]/u, 1)[0] ?? raw;
}

function within(root: string, candidate: string): boolean {
  const relation = relative(root, candidate);
  return (
    relation !== ".." &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
}

function countLines(lines: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

function subtractLineCounts(
  lines: readonly string[],
  available: Map<string, number>,
): string[] {
  const remaining = new Map(available);
  const difference: string[] = [];
  for (const line of lines) {
    const count = remaining.get(line) ?? 0;
    if (count > 0) remaining.set(line, count - 1);
    else difference.push(line);
  }
  return difference;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
