# Repository Knowledge Compiler

RKC helps coding agents create, maintain, and audit task-routed Markdown
documentation for a repository. The agent reads the relevant source and writes
ordinary files such as root `AGENTS.md` and a detailed documentation router.
The goal is faster navigation, less repeated codebase reading, and more accurate
future work. Documentation remains a guide to verify against code, not a
guarantee of completeness.

RKC supplies a versioned protocol and deterministic Markdown checks. The
coding agent running the skills does the repository analysis with its own model
and privacy settings; RKC does not run a separate model service.

## Requirements and installation

Node.js `>=24.12.0 <25` and npm `>=11 <12` are required. Install it for the
current user:

```sh
npx --yes repository-knowledge-compiler@latest install
npx --yes repository-knowledge-compiler@latest version
npx --yes repository-knowledge-compiler@latest doctor
```

Installation stores the active versioned core under `~/.rkc`, canonical skills
under `~/.agents/skills`, and managed Claude Code links under
`~/.claude/skills`. It does not add dependencies or state to the target
repository. Restart or refresh your coding agent if it does not detect newly
installed skills. The skill format is provider-neutral; host discovery may
require host-specific configuration. Claude Code link discovery has been
exercised; Codex VS Code and GitHub Copilot VS Code conformance remains to be
checked before claiming full host support.

## First documentation run

Open the repository in your coding agent and invoke one skill:

- `/rkc-help` explains installation and the repository's documentation state;
- `/rkc-create-docs` creates or substantially redesigns agent documentation;
- `/rkc-update-docs` updates affected documentation after repository changes;
- `/rkc-audit-docs` reports documentation drift without edits by default.

For a first run, use `/rkc-create-docs`. It inventories code and existing
documentation, presents one concise preflight, then creates or reconciles root
`AGENTS.md` and routed Markdown after approval. No initialization command or
repository-local RKC state is required.

## Updates, diagnostics, and removal

After Create, Update, or Audit finishes, RKC may check npm's stable `latest`
metadata. It checks at most once per seven days after success or retries after
one day on failure. It sends no repository code or documentation to npm, shows
an advisory only when a new version is available, and never installs it
automatically.

```sh
npx --yes repository-knowledge-compiler@latest doctor --check-updates
npx --yes repository-knowledge-compiler@latest doctor --disable-update-checks
npx --yes repository-knowledge-compiler@latest doctor --enable-update-checks
npx --yes repository-knowledge-compiler@latest self-update
npx --yes repository-knowledge-compiler@latest uninstall --dry-run
npx --yes repository-knowledge-compiler@latest uninstall --yes
```

`doctor` without a flag reads cached status. Self-update changes the
user-scoped core and skills; it does not migrate or rewrite repository
Markdown. Activation recovery and retained previous versions protect against
interrupted installs. Uninstall removes the managed user-scoped installation,
not repository documentation.

## Boundaries and help

RKC has no telemetry and does not upload repository content. The coding agent
uses its own provider connection under that agent's settings. Documentation
skills protect application source, dependency manifests and lockfiles, CI/CD,
secrets, production configuration, Git history, and unrelated user changes.
Create and Update may edit authorized documentation; Audit and Help are
read-only by default.

Generated knowledge may be partial or stale. Check primary code and relevant
tests before a behavior-changing edit; run Audit when accuracy or routing is
uncertain. If the skills are missing, check `version`, `doctor`, the user-scoped
skill paths, and your host's discovery settings. Report reproducible problems
at [GitHub Issues](https://github.com/Vivasergo/Repository-knowledge-compiler/issues)
with the RKC version and redacted diagnostics. See the
[release notes](https://github.com/Vivasergo/Repository-knowledge-compiler/blob/main/CHANGELOG.md)
and [MIT license](LICENSE).
