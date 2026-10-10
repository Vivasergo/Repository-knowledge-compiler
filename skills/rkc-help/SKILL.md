---
name: rkc-help
description: Explain the installed RKC, current repository documentation state, available RKC skills, and safe next action without modifying files.
---

# RKC Help

Remain read-only. Resolve `installation.json` and the active user-scoped RKC
core. Inspect the current repository's root `AGENTS.md`, canonical router,
documented source baseline, and relevant paths before asserting documentation
status. The presence of a file alone does not prove its accuracy. Do not search
unrelated installations, source checkouts, or npm caches. Ignore old
repository-local `.rkc/` state; it is not required for this workflow.

Answer the user's actual question in plain language. For questions about what
RKC does or why to use it, lead with the installed core's version-matched
overview: RKC aims to reduce repeated codebase reading and future context/token
use, speed up finding the change area, and improve accuracy through maintained,
task-routed documentation. Explain plainly that the AI coding agent in which
the owner runs RKC creates the documentation with that agent's selected model,
settings, and privacy controls; RKC does not separately send the repository to
another AI service. For installation, status, or troubleshooting questions,
answer the requested fact first rather than repeating a generic pitch.

When explaining the result of Create Docs, add one short paragraph: RKC also
prepares instructions for future coding agents, adapted to the repository and
existing documentation. These can cover code clarity, meaningful tests, commits
and version/changelog practices. Existing project rules take priority; absent
conventions are identified rather than presented as established policy. The
completion report names the rules actually added, clarified or preserved and
where to find them. Do not inspect all project policies just to answer Help.

Distinguish:

- machine installation and active RKC version;
- whether an RKC-style documentation surface is absent, present, or incomplete;
- the verified source revision only if clearly stated in the canonical router;
- unavailable or uncertain evidence and any material verification scope limit.

Use the heading "Available RKC skills". Show the installed skill names; slash notation may be used when this environment exposes them that way. Do not promise a universal `/rkc` command. Do not list supported/unsupported agents, internal conformance statuses or manifest-mismatch warnings based on the agent's name. Explain RKC's purpose without abstract file-access requirements or universal compatibility claims. Give actual installed skill paths only when needed for installation/discovery, and report concrete observed blockers. Keep technical installation-link paths separate from compatibility claims.
Route requested work to exactly one skill:

- help or explanation → `/rkc-help`;
- initial documentation or substantial documentation redesign →
  `/rkc-create-docs`;
- repository changes that may affect existing documentation →
  `/rkc-update-docs`;
- accuracy, freshness, contradiction, or routing review →
  `/rkc-audit-docs`.

Do not perform another operation implicitly. When the correct route is
uncertain, explain the difference and recommend the least expansive safe
operation. Do not describe old compiler IR, manifests, work orders, or
dual-renderer lifecycle as current V2 behavior.

For installation, version, update, rollback, or uninstall questions,
use only version-matched core self-description and diagnostics. Network update
checks and machine mutation require the explicit corresponding CLI action.
Never invent installation, project, version, revision, documentation, or audit
status.
