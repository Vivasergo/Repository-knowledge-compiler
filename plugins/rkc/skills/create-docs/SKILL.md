---
name: create-docs
description: Create or substantially refactor repository Markdown documentation for coding agents using the version-matched RKC documentation workflow.
---

# RKC Create Docs

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

Use this skill for the initial creation or substantial restructuring of a
repository's agent/developer knowledge surface. Do not use it for routine
maintenance of already accepted documentation; use `/rkc:update-docs` instead.
No repository initialization or local `.rkc/` state is required. The prompt's
read-only inventory supplies startup discovery and the single owner preflight.

Load the relative `documentation_master_prompt` path and
`documentation_prompt_version` declared by `<plugin-root>/core-manifest.json`.
The source-repository canonical prompt is
`docs/current/RKC-Documentation-Master-Prompt.md`. Never use a prompt from a
different installed version or reproduce a divergent copy of its semantics in
this skill.

Load `references/research-checkpoint-experiment.md` beside this skill and apply
`RKC-CREATE-FLOW-RELEASE-CANDIDATE-10`. It supplies bounded research checkpoints and temporary notes,
within the master's five-assignment ceiling and two final QA passes. Prefer
independently routed responsibilities over broad merged documents; research
assignment count never determines file count. Preserve non-obvious core contracts
rather than replacing them with source-only routes. The master remains authoritative for content,
evidence strength, document selection, uncertainty, source protection and
completion rules. This is an unpublished release candidate for one final full-repository control
run. Delete this run's notes after successful completion unless the owner explicitly
requests retention for a control run or diagnosis. Preserve interrupted or blocked
work. Create its research workspace automatically after ordinary
preflight approval; no extra owner request for notes is needed.

Preserve these operation boundaries:

- inspect before writing and present the prompt's single concise preflight;
- treat an unqualified owner approval as approval for the complete proposed
  documentation-only plan;
- create and modify documentation in English; owner-facing conversation may
  use the owner's language;
- always create or reconcile root `AGENTS.md` as the provider-neutral agent
  entry point; provider-specific instruction files never replace it;
- keep concise root `README.md` navigation to `AGENTS.md` and, when present,
  the canonical detailed router current;
- never modify application source, source comments, dependencies, lockfiles,
  CI/CD, secrets, production configuration, or user-owned worktree changes;
- do not execute repository code, install dependencies, or contact external
  systems without separate authorization; installed `node_modules/` is not a
  research corpus; read a dependency contract only when a specific critical
  question cannot be settled from project sources;
- do not delete existing documentation unless the owner explicitly approves
  that deletion;
- keep probable defects, external behavior, owner intent, and legacy behavior
  visibly classified instead of turning them into architectural truth.

Use the coding agent's repository tools and reasoning. RKC does not call a
provider SDK or require a separate model service.

At each genuine phase transition, give a concise owner-facing progress update
through the host conversation, including when scoped read-only workers are
running or the agent is awaiting their results. Do not invent percentages,
ask for extra approvals, or create project progress files. The three temporary
Markdown working files required by the reference are the sole research-storage
exception; keep them outside the target repository and the plugin directory.
Before recording success, follow the reference's research and transfer checks
and two final QA briefs, resolve confirmed
documentation defects, and report any review/check that could not run. Keep
the installed core's mechanical checks distinct from semantic QA.

After successful creation, run the installed core's deterministic Markdown
checks over every managed entry point and topical document created or modified
by the operation, including untracked files, by running
`node "<plugin-root>/scripts/rkc.mjs" check-docs "<repository-root>" <repository-relative-path>...`
(exit 0: valid; exit 1: issues listed in the JSON output). These checks include
mixed line endings and trailing whitespace and do not replace repository policy
or an applicable `.gitattributes`. Record the source revision actually checked
and material scope limits in the canonical Markdown router, normally
`docs/ai/README.md`. Never record an unverified HEAD as the verification
baseline. Do not create operational state, a knowledge manifest, or semantic IR.

Follow the master's substantive owner-facing report order: result, actual checks, generic
rule categories with canonical links, useful actions only, and one next step.
Use plain language; keep implementation and detailed QA findings in the docs.
Reuse final passages to verify scoped claims, links and executable recommendations.
Distinguish unavailable host transcripts from preserved reviewer handbacks.
Do not add another QA pass, promise completeness, or hide a material readiness limit.
After an initial creation, offer one review/commit proposal when useful;
never commit automatically. Include exact version/changelog proposals only when
required by project policy, before editing those files, and respect existing
authorization. Do not recommend `/rkc:update-docs` merely because that
documentation-only commit changes repository HEAD; use it after later changes
whose meaning may affect the documentation.
