export type InventoryClassification =
  | "eligible"
  | "ignored"
  | "generated"
  | "vendor"
  | "binary"
  | "oversized"
  | "sensitive"
  | "excluded";

export interface InventoryEntry {
  readonly path: string;
  readonly kind: "file" | "directory" | "symlink";
  readonly size_bytes: number;
  readonly classification: InventoryClassification;
  readonly reasons: readonly string[];
  readonly content_digest?: {
    readonly algorithm: "sha256";
    readonly value: string;
  };
}

export interface RepositoryInventory {
  readonly repository_root: string;
  readonly entries: readonly InventoryEntry[];
  readonly eligible_file_count: number;
  readonly eligible_text_bytes: number;
}

export interface GitObservation {
  readonly available: boolean;
  readonly repository_root?: string;
  readonly revision?: string;
  readonly branch?: string;
  readonly staged_identity?: string;
  readonly unstaged_identity?: string;
  readonly staged: readonly string[];
  readonly unstaged: readonly string[];
  readonly untracked: readonly string[];
  readonly reason?: string;
}

export interface RepositorySnapshot {
  readonly repository_root: string;
  readonly algorithm: "sha256";
  readonly value: string;
  readonly inventory: RepositoryInventory;
  readonly git: GitObservation;
}

export interface RedactionResult<T> {
  readonly value: T;
  readonly state: "none" | "redacted";
  readonly categories: readonly string[];
}
