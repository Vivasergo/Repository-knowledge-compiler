import { lstat, readFile } from "node:fs/promises";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

export type MarkdownIssueCode =
  | "invalid_path"
  | "missing_file"
  | "not_markdown"
  | "broken_relative_link"
  | "non_english_content"
  | "mixed_line_endings"
  | "trailing_whitespace"
  | "missing_read_signal"
  | "missing_skip_signal";

export interface MarkdownIssue {
  readonly code: MarkdownIssueCode;
  readonly path: string;
  readonly target?: string;
}

export interface MarkdownCheckResult {
  readonly checked_paths: readonly string[];
  readonly issues: readonly MarkdownIssue[];
  readonly valid: boolean;
}

export async function checkMarkdownDocumentation(
  repositoryRoot: string,
  documentationPaths: readonly string[],
): Promise<MarkdownCheckResult> {
  const root = resolve(repositoryRoot);
  const issues: MarkdownIssue[] = [];
  const checkedPaths: string[] = [];

  for (const input of documentationPaths) {
    const relativePath = safeRelativePath(root, input);
    if (relativePath === undefined) {
      issues.push({ code: "invalid_path", path: input });
      continue;
    }
    if (![".md", ".mdx"].includes(extname(relativePath).toLowerCase())) {
      issues.push({ code: "not_markdown", path: relativePath });
      continue;
    }

    const absolutePath = resolve(root, relativePath);
    let content: string;
    try {
      if (!(await lstat(absolutePath)).isFile()) {
        issues.push({ code: "missing_file", path: relativePath });
        continue;
      }
      content = await readFile(absolutePath, "utf8");
    } catch (error) {
      if (isMissing(error)) {
        issues.push({ code: "missing_file", path: relativePath });
        continue;
      }
      throw error;
    }

    checkedPaths.push(relativePath);
    if (isPredominantlyCyrillic(content)) {
      issues.push({ code: "non_english_content", path: relativePath });
    }
    if (hasMixedLineEndings(content)) {
      issues.push({ code: "mixed_line_endings", path: relativePath });
    }
    if (hasTrailingWhitespace(content)) {
      issues.push({ code: "trailing_whitespace", path: relativePath });
    }
    if (isTopicalDocument(relativePath)) {
      if (!/Read this when/iu.test(content)) {
        issues.push({ code: "missing_read_signal", path: relativePath });
      }
      if (!/Skip this when/iu.test(content)) {
        issues.push({ code: "missing_skip_signal", path: relativePath });
      }
    }

    for (const target of localMarkdownTargets(content)) {
      const decoded = decodeLinkTarget(target);
      if (decoded === undefined) continue;
      const destination = resolve(dirname(absolutePath), decoded);
      if (!isWithin(root, destination) || !(await pathExists(destination))) {
        issues.push({
          code: "broken_relative_link",
          path: relativePath,
          target,
        });
      }
    }
  }

  return {
    checked_paths: checkedPaths,
    issues,
    valid: issues.length === 0,
  };
}

function isPredominantlyCyrillic(content: string): boolean {
  const letters = content.match(/\p{L}/gu)?.length ?? 0;
  if (letters < 100) return false;
  const cyrillic = content.match(/[\u0400-\u04ff]/gu)?.length ?? 0;
  return cyrillic / letters > 0.1;
}

function hasMixedLineEndings(content: string): boolean {
  const crlfCount = content.match(/\r\n/gu)?.length ?? 0;
  const withoutCrlf = content.replace(/\r\n/gu, "");
  const lfCount = withoutCrlf.match(/\n/gu)?.length ?? 0;
  const crCount = withoutCrlf.match(/\r/gu)?.length ?? 0;
  return [crlfCount, lfCount, crCount].filter((count) => count > 0).length > 1;
}

function hasTrailingWhitespace(content: string): boolean {
  return content.split(/\r\n|\n|\r/gu).some((line) => /[ \t]+$/u.test(line));
}

function safeRelativePath(root: string, input: string): string | undefined {
  if (input.trim() === "" || isAbsolute(input)) return undefined;
  const destination = resolve(root, input);
  if (!isWithin(root, destination)) return undefined;
  return relative(root, destination).split(sep).join("/");
}

function isWithin(root: string, destination: string): boolean {
  const relation = relative(root, destination);
  return (
    relation !== ".." &&
    !relation.startsWith(`..${sep}`) &&
    !isAbsolute(relation)
  );
}

function isTopicalDocument(path: string): boolean {
  return /(^|\/)docs\/ai\/(flows|domains)\//u.test(path);
}

function localMarkdownTargets(content: string): readonly string[] {
  const targets: string[] = [];
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu;
  for (const match of content.matchAll(pattern)) {
    const target = match[1];
    if (
      target !== undefined &&
      !target.startsWith("#") &&
      !/^[a-z][a-z0-9+.-]*:/iu.test(target)
    ) {
      targets.push(target);
    }
  }
  return targets;
}

function decodeLinkTarget(target: string): string | undefined {
  const withoutFragment = target.split("#", 1)[0]?.split("?", 1)[0];
  if (withoutFragment === undefined || withoutFragment === "") return undefined;
  try {
    return decodeURIComponent(withoutFragment);
  } catch {
    return withoutFragment;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
