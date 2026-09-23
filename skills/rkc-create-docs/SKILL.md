---
name: rkc-create-docs
description: Create or substantially refactor repository Markdown documentation for coding agents using the version-matched RKC documentation workflow.
---

# RKC Create Docs

Use this skill for the initial creation or substantial restructuring of a
repository's agent/developer knowledge surface. Do not use it for routine
maintenance of already accepted documentation; use `rkc-update-docs` instead.
No repository initialization or local `.rkc/` state is required. The prompt's
read-only inventory supplies startup discovery and the single owner preflight.

Resolve the active user-scoped RKC installation from `installation.json` and
read `core_path` from that metadata, then load the relative
`documentation_master_prompt` path and `documentation_prompt_version` declared by
`<core_path>/core-manifest.json`.
The source-repository canonical prompt is
`docs/current/RKC-Documentation-Master-Prompt.md`. Never use a prompt from a
different installed version or reproduce a divergent copy of its semantics in
this skill.

Apply the master prompt to the current repository. Its phases, evidence order,
uncertainty markers, progressive-disclosure architecture, owner checkpoint,
content rules, and internal verification are authoritative.

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
ask for extra checkpoints, or create progress files. Before recording
success, follow the master prompt's independent QA brief, resolve confirmed
documentation defects, and report any review/check that could not run. Keep
the installed core's mechanical checks distinct from semantic QA.

After successful creation, run the installed core's deterministic Markdown
checks over every managed entry point and topical document created or modified
by the operation, including untracked files, by calling
`checkMarkdownDocumentation` from the installed core entry. These checks include
mixed line endings and trailing whitespace and do not replace repository policy
or an applicable `.gitattributes`. Record the source revision actually checked
and material scope limits in the canonical Markdown router, normally
`docs/ai/README.md`. Never record an unverified HEAD as the verification
baseline. Do not create operational state, a knowledge manifest, or semantic IR.

After the operation reaches a terminal result, run the installed maintenance
entry with Node:
`node "<core_path>/node_modules/repository-knowledge-compiler/dist/post-operation.js" rkc-create-docs`.
Resolve `core_path` from this skill's `installation.json` and quote the actual
platform path. This is a best-effort, user-scoped npm registry metadata check:
it respects the seven-day success and one-day failure cadence and the owner's
automatic-check setting, sends no repository content, and never installs an
update. It is the sole automatic external-system exception to the creation
boundary above. If a new-version notice is printed, append it to the final
owner-facing response after the documentation result. A check failure must not
change the documentation result.

Write the concise owner-facing completion report required by the master prompt.
Summarize the documentation surface, why its routes were selected, how future
agents will use it, verification actually performed, and only limitations that
affect readiness or need owner attention. Describe resolved QA work neutrally as
review and refinement rather than a user-facing error log. Do not dump sample
functions, raw risk identifiers, detailed QA findings, or counts of unresolved
markers. Do not claim broader coverage or verification than the final documents
and checks support.
After an initial creation, recommend review and commit of the generated
documentation. Do not recommend `rkc-update-docs` merely because that
documentation-only commit changes repository HEAD; use it after later changes
whose meaning may affect the documentation.
