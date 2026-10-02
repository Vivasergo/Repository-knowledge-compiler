# Changelog

## 2.1.0

- Simplified Help's environment explanation and clarified that verified host
  examples do not restrict agents or models. Included owner-confirmed Claude
  Code usage and distinguished historical update checks from current status.
- Prioritized accuracy, useful coverage, and maintenance guidance over shorter
  documentation. Clarified that merging and summarizing must retain material
  conditions, exceptions, and task routes, with neutral sufficiency review.
- Improved documentation guidance for recurring changes, including affected
  contracts, related paths, and appropriate verification.
- Clarified test coverage boundaries and manual acceptance scenarios so
  future agents can choose checks without overstating their guarantees.
- Kept routed documentation responsible for consequential knowledge, with
  local API contracts and short comments serving their own limited purpose.
  Documentation operations do not add or modify source comments.
- Strengthened bounded coverage review to assess useful knowledge for named
  features as well as missing task routes, without requiring more documents
  or a fixed repository template.
- Updated the bundled master prompt to `RKC-DOCS-CREATE-2.16` and aligned
  Update/Audit guidance with these maintenance rules.

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
