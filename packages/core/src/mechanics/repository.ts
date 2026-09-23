import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
} from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  matchesGlob,
  relative,
  resolve,
  sep,
} from "node:path";
import { promisify } from "node:util";

import type {
  GitObservation,
  InventoryClassification,
  InventoryEntry,
  RepositoryInventory,
  RepositorySnapshot,
} from "./types.js";

const execFileAsync = promisify(execFile);
const ROOT_MARKERS = [
  ".rkc/project.json",
  ".git",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
] as const;
const GENERATED_SEGMENTS = new Set([
  "build",
  "coverage",
  "dist",
  "out",
  "target",
  ".next",
]);
const VENDOR_SEGMENTS = new Set(["node_modules", "vendor"]);
const IGNORED_SEGMENTS = new Set([".git", ".hg", ".svn"]);
const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avi",
  ".bin",
  ".bmp",
  ".class",
  ".dll",
  ".doc",
  ".docx",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".o",
  ".pdf",
  ".png",
  ".so",
  ".tar",
  ".tgz",
  ".wav",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);
const SENSITIVE_BASENAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
]);

export interface RepositoryRootOptions {
  readonly ceiling?: string;
}

export interface RepositoryRootResult {
  readonly root: string;
  readonly marker: string;
}

export interface InventoryOptions {
  readonly include?: readonly string[];
  readonly exclude?: readonly string[];
  readonly oversized_threshold_bytes?: number;
  readonly respect_gitignore?: boolean;
}

export async function discoverRepositoryRoot(
  startPath: string,
  options: RepositoryRootOptions = {},
): Promise<RepositoryRootResult> {
  const start = resolve(startPath);
  const startStats = await lstat(start);
  let current = startStats.isDirectory() ? start : dirname(start);
  const ceiling = resolve(options.ceiling ?? pathRoot(current));
  assertWithin(ceiling, current);

  while (true) {
    for (const marker of ROOT_MARKERS) {
      if (await pathExists(join(current, marker))) {
        return { root: current, marker };
      }
    }
    if (current === ceiling) break;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return {
    root: startStats.isDirectory() ? start : dirname(start),
    marker: "explicit_start",
  };
}

export async function inventoryRepository(
  rootPath: string,
  options: InventoryOptions = {},
): Promise<RepositoryInventory> {
  const root = await realpath(rootPath);
  const include = options.include ?? [];
  const exclude = options.exclude ?? [];
  const threshold = options.oversized_threshold_bytes ?? 1_048_576;
  const gitignore =
    options.respect_gitignore === false ? [] : await loadGitignore(root);
  const entries: InventoryEntry[] = [];

  await walk("");
  entries.sort((left, right) => left.path.localeCompare(right.path));
  const eligibleFiles = entries.filter(
    (entry) => entry.kind === "file" && entry.classification === "eligible",
  );
  return {
    repository_root: root,
    entries,
    eligible_file_count: eligibleFiles.length,
    eligible_text_bytes: eligibleFiles.reduce(
      (total, entry) => total + entry.size_bytes,
      0,
    ),
  };

  async function walk(relativeDirectory: string): Promise<void> {
    const absoluteDirectory = join(root, relativeDirectory);
    const children = await readdir(absoluteDirectory, {
      withFileTypes: true,
    });
    children.sort((left, right) => left.name.localeCompare(right.name));
    for (const child of children) {
      const relativePath = toPosix(join(relativeDirectory, child.name));
      const absolutePath = join(root, relativePath);
      const stats = await lstat(absolutePath);

      if (child.isSymbolicLink()) {
        entries.push({
          path: relativePath,
          kind: "symlink",
          size_bytes: stats.size,
          classification: "excluded",
          reasons: ["symlink_not_followed"],
          content_digest: digestText(await readlink(absolutePath)),
        });
        continue;
      }

      const classification = classifyPath(
        relativePath,
        child.isDirectory(),
        stats.size,
        include,
        exclude,
        gitignore,
        threshold,
      );
      if (child.isDirectory()) {
        if (classification.classification !== "eligible") {
          entries.push({
            path: `${relativePath}/`,
            kind: "directory",
            size_bytes: stats.size,
            ...classification,
          });
          if (!include.some((pattern) => mayContain(relativePath, pattern))) {
            continue;
          }
        }
        await walk(relativePath);
        continue;
      }
      if (!child.isFile()) continue;

      let finalClassification = classification;
      if (
        classification.classification === "eligible" &&
        (await looksBinary(absolutePath))
      ) {
        finalClassification = {
          classification: "binary",
          reasons: ["binary_content"],
        };
      }
      entries.push({
        path: relativePath,
        kind: "file",
        size_bytes: stats.size,
        ...finalClassification,
        content_digest: await digestFile(absolutePath),
      });
    }
  }
}

export async function observeGit(rootPath: string): Promise<GitObservation> {
  const root = await realpath(rootPath);
  try {
    const gitRoot = stripNewline(
      await git(root, ["rev-parse", "--show-toplevel"]),
    );
    const canonicalGitRoot = await realpath(gitRoot);
    const revision = await optionalGit(root, ["rev-parse", "--verify", "HEAD"]);
    const branch = await optionalGit(root, [
      "symbolic-ref",
      "--quiet",
      "--short",
      "HEAD",
    ]);
    const [staged, unstaged, untracked, stagedRaw, unstagedRaw] =
      await Promise.all([
        gitPaths(root, ["diff", "--name-only", "--cached", "-z"]),
        gitPaths(root, ["diff", "--name-only", "-z"]),
        gitPaths(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
        git(root, ["diff", "--cached", "--raw", "-z", "--no-abbrev"]),
        git(root, ["diff", "--raw", "-z", "--no-abbrev"]),
      ]);
    return {
      available: true,
      repository_root: canonicalGitRoot,
      ...(revision ? { revision } : {}),
      ...(branch ? { branch } : {}),
      staged_identity: digestText(stagedRaw).value,
      unstaged_identity: digestText(unstagedRaw).value,
      staged,
      unstaged,
      untracked,
    };
  } catch (error) {
    return {
      available: false,
      staged: [],
      unstaged: [],
      untracked: [],
      reason: gitFailureReason(error),
    };
  }
}

export async function createRepositorySnapshot(
  rootPath: string,
  options: InventoryOptions = {},
): Promise<RepositorySnapshot> {
  const inventory = await inventoryRepository(rootPath, options);
  const gitObservation = await observeGit(rootPath);
  const identityInput = {
    entries: inventory.entries
      .filter((entry) => entry.classification === "eligible")
      .map((entry) => ({
        path: entry.path,
        kind: entry.kind,
        classification: entry.classification,
        size_bytes: entry.size_bytes,
        digest: entry.content_digest?.value,
      })),
    git: {
      available: gitObservation.available,
      revision: gitObservation.revision,
      staged_identity: gitObservation.staged_identity,
      unstaged_identity: gitObservation.unstaged_identity,
      staged: gitObservation.staged,
      unstaged: gitObservation.unstaged,
      untracked: gitObservation.untracked,
    },
  };
  return {
    repository_root: inventory.repository_root,
    algorithm: "sha256",
    value: createHash("sha256")
      .update(JSON.stringify(identityInput))
      .digest("hex"),
    inventory,
    git: gitObservation,
  };
}

function classifyPath(
  path: string,
  directory: boolean,
  size: number,
  include: readonly string[],
  exclude: readonly string[],
  gitignore: readonly string[],
  threshold: number,
): {
  readonly classification: InventoryClassification;
  readonly reasons: readonly string[];
} {
  if (matchesAny(path, exclude, directory)) {
    return { classification: "excluded", reasons: ["explicit_exclude"] };
  }
  const segments = path.split("/");
  if (
    segments[0] === ".rkc" &&
    ["cache", "runs", "logs", "tmp"].includes(segments[1] ?? "")
  ) {
    return { classification: "ignored", reasons: ["rkc_operational_state"] };
  }
  if (segments.some((segment) => IGNORED_SEGMENTS.has(segment))) {
    return { classification: "ignored", reasons: ["vcs_metadata"] };
  }
  if (isSensitivePath(path)) {
    return { classification: "sensitive", reasons: ["sensitive_path"] };
  }
  const explicitlyIncluded = matchesAny(path, include, directory);
  if (!explicitlyIncluded && matchesGitignore(path, directory, gitignore)) {
    return { classification: "ignored", reasons: ["gitignore"] };
  }
  if (
    !explicitlyIncluded &&
    segments.some((segment) => VENDOR_SEGMENTS.has(segment))
  ) {
    return { classification: "vendor", reasons: ["vendor_directory"] };
  }
  if (
    !explicitlyIncluded &&
    segments.some((segment) => GENERATED_SEGMENTS.has(segment))
  ) {
    return {
      classification: "generated",
      reasons: ["generated_directory"],
    };
  }
  if (!directory && isBinaryExtension(path)) {
    return { classification: "binary", reasons: ["binary_extension"] };
  }
  if (!directory && size > threshold) {
    return { classification: "oversized", reasons: ["oversized"] };
  }
  return {
    classification: "eligible",
    reasons: explicitlyIncluded ? ["explicit_include"] : [],
  };
}

async function loadGitignore(root: string): Promise<readonly string[]> {
  try {
    const content = await readFile(join(root, ".gitignore"), "utf8");
    return content
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
}

function matchesGitignore(
  path: string,
  directory: boolean,
  patterns: readonly string[],
): boolean {
  let ignored = false;
  for (const raw of patterns) {
    const negated = raw.startsWith("!");
    const pattern = negated ? raw.slice(1) : raw;
    if (matchesIgnorePattern(path, directory, pattern)) ignored = !negated;
  }
  return ignored;
}

function matchesIgnorePattern(
  path: string,
  directory: boolean,
  pattern: string,
): boolean {
  const normalized = pattern.replace(/^\//u, "").replace(/\/$/u, "");
  if (!normalized) return false;
  const candidate = directory ? `${path}/` : path;
  if (normalized.includes("/")) {
    return (
      matchesGlob(candidate, normalized) ||
      matchesGlob(candidate, `${normalized}/**`)
    );
  }
  return path.split("/").some((segment) => matchesGlob(segment, normalized));
}

function matchesAny(
  path: string,
  patterns: readonly string[],
  directory: boolean,
): boolean {
  return patterns.some((pattern) =>
    matchesIgnorePattern(path, directory, pattern),
  );
}

function mayContain(directory: string, includePattern: string): boolean {
  const fixedPrefix =
    includePattern.split(/[?*[]/u, 1)[0]?.replace(/\/$/u, "") ?? "";
  return fixedPrefix === directory || fixedPrefix.startsWith(`${directory}/`);
}

function isSensitivePath(path: string): boolean {
  const name = basename(path).toLowerCase();
  return (
    SENSITIVE_BASENAMES.has(name) ||
    name.endsWith(".pem") ||
    name.endsWith(".p12") ||
    name.endsWith(".pfx") ||
    name.endsWith(".key") ||
    /(?:^|\/)(?:secrets?|credentials?)(?:\/|$)/iu.test(path)
  );
}

function isBinaryExtension(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot >= 0 && BINARY_EXTENSIONS.has(path.slice(dot).toLowerCase());
}

async function looksBinary(path: string): Promise<boolean> {
  const file = await open(path, "r");
  try {
    const buffer = Buffer.alloc(8192);
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await file.close();
  }
}

async function digestFile(
  path: string,
): Promise<{ algorithm: "sha256"; value: string }> {
  const hash = createHash("sha256");
  const file = await open(path, "r");
  try {
    for await (const chunk of file.readableWebStream()) {
      hash.update(Buffer.from(chunk));
    }
  } finally {
    await file.close();
  }
  return { algorithm: "sha256", value: hash.digest("hex") };
}

function digestText(value: string): {
  algorithm: "sha256";
  value: string;
} {
  return {
    algorithm: "sha256",
    value: createHash("sha256").update(value).digest("hex"),
  };
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", root, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout;
}

async function optionalGit(
  root: string,
  args: readonly string[],
): Promise<string | undefined> {
  try {
    const output = stripNewline(await git(root, args));
    return output || undefined;
  } catch {
    return undefined;
  }
}

async function gitPaths(
  root: string,
  args: readonly string[],
): Promise<readonly string[]> {
  return (await git(root, args))
    .split("\0")
    .filter(Boolean)
    .map(toPosix)
    .sort();
}

function gitFailureReason(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    return "git_unavailable";
  }
  return "not_a_git_repository";
}

function stripNewline(value: string): string {
  return value.replace(/[\r\n]+$/u, "");
}

function pathRoot(path: string): string {
  let current = resolve(path);
  while (dirname(current) !== current) current = dirname(current);
  return current;
}

function assertWithin(root: string, candidate: string): void {
  const relation = relative(root, candidate);
  if (
    relation.startsWith(`..${sep}`) ||
    relation === ".." ||
    isAbsolute(relation)
  ) {
    throw new Error("Path is outside the permitted repository boundary.");
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

function toPosix(path: string): string {
  return path.split(sep).join("/");
}
