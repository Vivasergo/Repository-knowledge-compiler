# RKC Repository Instructions

Read root `README.md`, `CONTRIBUTING.md`, the installed skill instructions,
and `docs/current/RKC-Documentation-Master-Prompt.md` as needed for the current
task. Check source and tests for actual behavior. The Markdown-first workflow
and protected mutation boundary are the product contract.

## Branch workflow

- Keep `main` at the latest accepted and validated RKC source. Start each new
  version or change on a branch from current `main`; keep unfinished work on
  that branch. Run the required checks against the exact candidate before
  advancing `main`, and recheck if the candidate changes.
- Bring validated work into `main`, using a fast-forward when possible. Verify
  that `main` contains the intended commits, then delete the merged branch.
  Review older divergent branches for unique work before deleting them; do not
  discard unmerged work just because its branch is old.

- Keep skills provider-neutral and concise. The master prompt owns the creation
  workflow; the small core owns installation, lifecycle safety, minimal state,
  repository boundaries, and deterministic checks.
- A successful `rkc-create-docs` operation must leave a provider-neutral root
  `AGENTS.md` as the universal agent entry point, creating it when absent and
  reconciling useful existing rules when present. Provider-specific instruction
  files do not replace it. Keep root `README.md` navigation to `AGENTS.md` and
  the canonical detailed router concise and current.
- Treat routed documentation as maintained guidance, not proof of completeness.
  When primary sources inspected for the current task contradict it or reveal
  missing non-obvious knowledge that would materially improve similar future
  work, verify the immediate writer, consumer, and relevant tests. During
  authorized implementation work, update only directly affected documentation;
  during read-only work, report the narrow correction. Prefer an existing
  canonical document, keep claims within the evidence inspected, and keep new
  knowledge reachable through the router. Do not document ordinary local
  changes or expand task-local findings into an automatic repository-wide audit.
- Keep unresolved questions unresolved. Do not turn guesses into code,
  documentation, state, or tests.
- Do not introduce assumptions, identifiers, or domain behavior copied from a
  source or evaluation repository into core code, primary fixtures, or reusable
  documentation.
- Do not add target-application dependencies during RKC installation or
  documentation work.
- Protect application source, dependencies, lockfiles, CI/CD, secrets,
  production configuration, Git history, and user-owned worktree changes.
- Run `npm run check` for foundation changes.
- Preserve repository text-file policy. Deterministic Markdown checks must
  cover mixed line endings and trailing whitespace in created or modified
  managed documents, including untracked files.
- Before every update of `main`, run `npm run check:changed -- <each changed
file>` against the exact files that will be committed. When a commit is
  assembled through a remote Git API, validate the exact serialized candidate
  bytes before moving the branch ref.
- Report checks truthfully: distinguish checks that passed, checks that were not
  runnable, and the exact remaining local command.
- Keep internal worker protocol separate from owner-facing instructions. An
  ordinary owner response may simply approve, reject, or amend a proposed
  action.
- Reconcile actual installation and project state before installation,
  initialization, cleanup, archival, or deletion. Distinguish the user-scoped
  installed core from repository-local `.rkc` state.
- Do not add telemetry, broad benchmarks, RAG, manifests, graph storage, or npm
  publication without a separate owner decision.
