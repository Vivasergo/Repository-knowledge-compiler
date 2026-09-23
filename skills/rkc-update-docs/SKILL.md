---
name: rkc-update-docs
description: Reconcile existing RKC Markdown documentation with repository changes and update only knowledge whose meaning is affected.
---

# RKC Update Docs

Use this skill when a repository already has an RKC-style Markdown knowledge
surface and code, tests, configuration, CI, external assumptions, or owner
decisions have changed.

Resolve the active user-scoped RKC installation. Read the repository
instructions, the canonical documentation router and its declared verified
source revision, when present, and the current change set. No project
initialization or `.rkc/` state is needed. Git may accelerate read-only
comparison when available; absence of Git or a reliable baseline requires
further task-scoped primary-source inspection, not invented change history.

Determine semantic impact before editing documentation:

1. identify changed behavior, contracts, tests, and configuration;
2. route those changes through documented maintenance triggers, flows, domains,
   risks, decisions, and sibling paths;
3. inspect enough current primary evidence to determine whether existing
   knowledge remains true;
4. update only documentation whose meaning, routing, risk, or verification
   guidance changed;
5. if no documentation change is justified, report that outcome without
   rewriting files.

Do not regenerate the entire documentation tree by default. Expand inspection
when impact is structural, cross-domain, weakly mapped, or uncertain. If safe
scope cannot be established, stop with a clear wider-audit recommendation
instead of declaring unrelated documentation current.

Preserve the same safety and truth boundaries as `rkc-create-docs`:

- generated or modified documentation is English;
- application source, dependencies, lockfiles, CI/CD, secrets, production
  configuration, and user-owned worktree changes remain untouched;
- repository commands and external systems require separate authorization;
- probable defects are `[RISK]`, external behavior is `[EXTERNAL]`, and
  unsupported owner intent is `[VERIFY]`;
- existing documents are not deleted without explicit owner approval.

Ordinary invocation authorizes the necessary in-scope documentation updates;
do not add another owner checkpoint for routine non-destructive edits. Ask only
when deletion, conflicting owner intent, expanded mutation authority, or a
materially different documentation architecture is required.

After successful semantic review, run the installed core's deterministic
Markdown checks over affected managed documents with
`checkMarkdownDocumentation`. Update Markdown provenance only to the extent
actually verified. A task-scoped update must not replace a repository-wide
baseline with a new HEAD while implying unchecked areas are current. Do not
create operational state, a knowledge IR, or a documentation manifest.
After the operation reaches a terminal result, run the installed maintenance
entry with Node:
`node "<core_path>/node_modules/repository-knowledge-compiler/dist/post-operation.js" rkc-update-docs`.
Resolve `core_path` from the installed skill's `installation.json` and quote
the actual platform path. This best-effort check sends only npm package metadata,
respects the owner's automatic-check setting and cached cadence, and never
installs an update. It is the sole automatic external-system exception to the
operation boundary above. Append a printed new-version notice after the task
result; a failed check must not change that result.

Report changed documentation paths, unchanged affected documents when useful,
remaining uncertainty, verification actually performed, and unavailable
checks. Never claim that all documentation is current when only a bounded
impact area was inspected.
