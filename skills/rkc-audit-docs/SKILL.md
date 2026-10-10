---
name: rkc-audit-docs
description: Audit RKC-style repository Markdown for accuracy, routing, contradictions, uncertainty, and freshness without modifying files by default.
---

# RKC Audit Docs

Use this skill to assess whether existing repository documentation remains a
safe and useful knowledge surface for cold-context coding agents.

Remain read-only by default. Resolve the active user-scoped RKC installation,
then read repository instructions, the canonical router, documentation entry
points, its declared verified source revision when present, and relevant
current repository evidence. Neither create nor require repository-local
`.rkc/` state; old local state is not evidence of freshness.

Call `checkMarkdownDocumentation` from the installed core for the mechanical
portion; do not treat them as semantic proof.

Audit two layers:

- mechanical integrity: referenced paths and relative links, active router
  targets, missing or orphaned managed documents, language consistency, and
  declared versus executed command status;
- semantic integrity: contradictions, overly broad global rules, unsupported
  intent, stale risks or decisions, missing high-impact flows, duplicated
  canonical knowledge, incorrect uncertainty markers, and routes that omit
  relevant sibling paths or checks.

Within the affected scope, check whether important existing conditions,
fallback/removal reasons, owner decisions and external evidence were lost or
misclassified. Check stable risk IDs and index/detail links when that structure
exists, and whether adaptive implementation, test and commit/version guidance is
reachable and consistent with project rules. Do not create findings to fill a
quota, require a second details file, run a global comment/test audit or treat a
proposed remedy as an accepted design. This read-only operation performs no commit
and does not propose an empty one.

Use change history and maintenance triggers to focus the audit when impact is
bounded. Expand to a wider repository audit when the baseline is missing,
structural changes are present, routing is unreliable, or material
contradictions make selective confidence unsafe.

Do not fix application code or treat incidental repository defects as RKC
failures. Report them separately with evidence and an appropriate `[RISK]`,
`[EXTERNAL]`, or `[VERIFY]` classification.

After the operation reaches a terminal result, run the installed maintenance
entry with Node:
`node "<core_path>/node_modules/repository-knowledge-compiler/dist/post-operation.js" rkc-audit-docs`.
Resolve `core_path` from the installed skill's `installation.json` and quote
the actual platform path. This best-effort check sends only npm package metadata,
respects the owner's automatic-check setting and cached cadence, and never
installs an update. It is the sole automatic external-system exception to the
operation boundary above. Append a printed new-version notice after the audit
result; a failed check must not change that result.

The report must distinguish:

- documentation that was semantically checked;
- documentation checked only mechanically;
- documentation outside the audit scope;
- confirmed contradictions or stale knowledge;
- unavailable repository commands or external verification.

Do not claim complete correctness from link checks or a partial semantic sample.
Do not modify documentation unless the owner explicitly requests remediation.
When remediation is approved, route the bounded work through
`rkc-update-docs`; use `rkc-create-docs` only when the architecture itself
must be rebuilt.

Never modify application source, dependencies, lockfiles, CI/CD, secrets,
production configuration, Git history, or user-owned worktree changes.
