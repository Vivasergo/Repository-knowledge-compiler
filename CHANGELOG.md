# Changelog

## Unreleased

## 2.1.0

Prepared release; publication pending.

- Strengthen task-based Create research and transfer checks to preserve material
  edit/delete behavior, gating, asynchronous outcomes, persistence, and state
  ownership. A shared writer API does not replace capability-specific contracts.
- Route focused flows and domains without a document quota; preserve useful
  existing knowledge and distinguish verified behavior from external uncertainty.
- Bound Create to five subagent assignments, including two final reviews for
  accuracy and task usefulness, with one owner preflight.
- Keep temporary research and review notes outside the target repository. Remove
  successful runs by default; preserve explicitly retained or interrupted runs.
- Preserve notes when cleanup starts inside its own run directory and explain how
  to retry outside it, avoiding partial cleanup caused by Windows directory locks.
- Improve completion reports with usable entry points, actual check results,
  actionable links, and visibility of obsolete routes in protected instructions.
- Add project-adaptive guidance for code clarity, risk-based testing, explicit
  commit approval, and existing version/changelog conventions; keep unresolved
  owner choices explicit.
- Explain skill discovery and availability without implying universal host support.

## 2.0.0

First public release of RKC V2.

- Introduced the Markdown-first, init-free RKC V2 workflow with four skills:
  `/rkc-help`, `/rkc-create-docs`, `/rkc-update-docs`, and
  `/rkc-audit-docs`.
- Added a required root `AGENTS.md` entry point, task-routed documentation,
  verified source-revision guidance, bounded updates, and read-only audits.
- Packaged a versioned user-scoped core and matching master prompt, with
  deterministic Markdown checks, protected repository boundaries, safe
  activation recovery, retained versions, and confirmed uninstall.
- Added advisory npm `latest` checks after completed Create, Update, and
  Audit operations. Checks use a cached cadence and recommend an explicit
  `self-update`; they do not install updates automatically.
- Licensed RKC's original code, skills, prompt, and documentation under MIT.

### Known limits

RKC's skills guide the client's coding agent; RKC does not provide its own AI
model or analyze repository code independently. The documentation produced by
`/rkc-create-docs` depends on the repository evidence and the agent and model
used by the client, so its coverage is not exhaustive. As the repository
changes, use `/rkc-update-docs` to maintain affected documentation and
`/rkc-audit-docs` to review its accuracy and routing. Installing a new RKC
version does not automatically rewrite repository Markdown.
