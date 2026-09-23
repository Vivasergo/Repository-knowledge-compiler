import { inventoryRepository } from "./repository.js";

export interface RepositoryMutationBoundary {
  readonly repository_root: string;
  readonly allowed_paths: readonly string[];
  readonly protected_files: Readonly<Record<string, string>>;
}

export async function captureRepositoryMutationBoundary(
  repositoryRoot: string,
  allowedPaths: readonly string[],
): Promise<RepositoryMutationBoundary> {
  const inventory = await inventoryRepository(repositoryRoot);
  const allowed = new Set(allowedPaths);
  return {
    repository_root: inventory.repository_root,
    allowed_paths: [...allowed].sort(),
    protected_files: Object.fromEntries(
      inventory.entries
        .filter(
          (entry) =>
            (entry.kind === "file" || entry.kind === "symlink") &&
            !entry.path.startsWith(".rkc/") &&
            !allowed.has(entry.path),
        )
        .map((entry) => [entry.path, entry.content_digest?.value ?? ""]),
    ),
  };
}

export async function validateRepositoryMutationBoundary(
  before: RepositoryMutationBoundary,
): Promise<readonly string[]> {
  const after = await captureRepositoryMutationBoundary(
    before.repository_root,
    before.allowed_paths,
  );
  const paths = new Set([
    ...Object.keys(before.protected_files),
    ...Object.keys(after.protected_files),
  ]);
  return [...paths]
    .filter(
      (path) => before.protected_files[path] !== after.protected_files[path],
    )
    .sort();
}
