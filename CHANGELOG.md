# Changelog

RKC has no previously published npm release. This file records the first
public release candidate; its version and date will be finalized with the
validated release commit.

## 2.0.0 — planned

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

Generated documentation requires task-local source verification and may be
incomplete or stale. Installing a new RKC version does not automatically
rewrite or migrate a repository's Markdown. Host-specific skill discovery
must be checked in the user's coding agent.
