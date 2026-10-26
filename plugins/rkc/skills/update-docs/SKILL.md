---
name: update-docs
description: Reconcile existing RKC Markdown documentation with repository changes and update only knowledge whose meaning is affected.
---

# RKC Update Docs

## Plugin runtime

This skill runs from the RKC Claude Code plugin. `<plugin-root>` is
`${CLAUDE_PLUGIN_ROOT}`, the plugin directory two levels above this skill's
base directory; quote its actual absolute path in commands. Run plugin helpers
(Node.js 22 or later) with
`node "<plugin-root>/scripts/rkc.mjs" <command>`.
The plugin has no separate installation metadata or npm self-update: Claude
Code's plugin manager installs, updates, and removes it. The master prompt and
references name operations
`/rkc-<operation>`; this plugin invokes them as `/rkc:<operation>`. Use that
form in owner-facing messages and in documentation you write.

Use this skill when a repository already has an RKC-style Markdown knowledge
surface and code, tests, configuration, CI, external assumptions, or owner
decisions have changed.

Resolve the RKC plugin runtime at `<plugin-root>`. Read the repository
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

Preserve applicable existing guidance, owner decisions and external knowledge
with provenance; absence of code proof does not invalidate a requirement. Resolve
current-behavior conflicts from primary evidence and keep the uncertainty clear.
Retain important conditions, fallback reasons and removal criteria; refine the
canonical explanation rather than appending duplicates. Reconcile directly
affected developer docs, README and agent/skill routes within scope. Update active
risk IDs, index/detail links and resolved entries together; do not require a
second details file for a small surface. Retain the adaptive code-clarity,
risk-based testing, commit and project-version guidance without rewriting source,
tests or release files during this docs-only operation.

Do not regenerate the entire documentation tree by default. Expand inspection
when impact is structural, cross-domain, weakly mapped, or uncertain. If safe
scope cannot be established, stop with a clear wider-audit recommendation
instead of declaring unrelated documentation current.

Preserve the same safety and truth boundaries as `/rkc:create-docs`:

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
`node "<plugin-root>/scripts/rkc.mjs" check-docs "<repository-root>" <repository-relative-path>...`. Update Markdown provenance only to the extent
actually verified. A task-scoped update must not replace a repository-wide
baseline with a new HEAD while implying unchecked areas are current. Do not
create operational state, a knowledge IR, or a documentation manifest.

If files changed, offer one end-of-task commit proposal only when useful and
not already authorized; do not commit automatically or repeat approval prompts.
Respect the project's version/changelog policy; show required release-text edits
before making them. Do not propose an empty commit after a no-change result.

When future-agent rules changed in this update, briefly identify the added or
clarified rules and canonical locations. Mention preserved rules only when
material to the task; do not repeat an unchanged checklist after every update.
Distinguish established project conventions, generic guidance and open decisions.

Report changed documentation paths, unchanged affected documents when useful,
remaining uncertainty, verification actually performed, and unavailable
checks. Never claim that all documentation is current when only a bounded
impact area was inspected.
