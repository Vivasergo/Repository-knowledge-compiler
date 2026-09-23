# Repository Knowledge Compiler

Repository Knowledge Compiler (RKC) helps coding agents create, maintain, and
audit task-routed Markdown documentation for software repositories. The agent
inspects the code; RKC provides a versioned workflow, four skills, safe
user-scoped installation, and deterministic Markdown checks. The documentation
is a guide for future work and must be verified against relevant source.

## Install and use

RKC requires Node.js `>=24.12.0 <25` and npm `>=11 <12`. Install it for the
current user:

```sh
npx --yes repository-knowledge-compiler@latest install
npx --yes repository-knowledge-compiler@latest version
```

Open a target repository in your coding agent and invoke one of the installed
skills:

- `/rkc-help` — inspect documentation state and find the right operation;
- `/rkc-create-docs` — create or reconcile root `AGENTS.md` and routed
  documentation after a concise preflight;
- `/rkc-update-docs` — update documentation affected by source changes;
- `/rkc-audit-docs` — report drift without edits by default.

See the [package guide](packages/bootstrap/README.md) for update, diagnostic,
uninstall, privacy, host discovery, and troubleshooting instructions.

## How it works

RKC installs a versioned core and matching prompt for the current user, plus
four canonical skills under `~/.agents/skills`. Managed links under
`~/.claude/skills` expose those skills to Claude Code. It does not add
dependencies or operational state to the target repository. The installed
package carries the [documentation master prompt](docs/current/RKC-Documentation-Master-Prompt.md).

RKC does not run a model API or upload repository content. The coding agent
uses its own provider connection and settings. Documentation skills protect
application source, dependencies, lockfiles, CI/CD, secrets, production
configuration, Git history, and unrelated worktree changes. Generated
documentation may be partial or become stale; check relevant source and tests
before relying on behavioral claims.

## Develop RKC

The workspace contains `packages/bootstrap` (the publishable npm package),
`packages/core` (runtime and deterministic checks), `skills` (four
operations), `scripts` (build and validation), and `fixtures` (isolated test
repositories). The npm tarball includes only the package's declared runtime,
payload, package README, and license.

Use Node.js `>=24.12.0 <25` and npm `>=11 <12`:

```sh
npm ci
npm run check
npm run release:check
npm pack --dry-run --workspace repository-knowledge-compiler
```

Read [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md)
before proposing changes. The [CHANGELOG.md](CHANGELOG.md) records releases;
[LICENSE](LICENSE) contains the MIT terms. Local checks and packing do not publish to npm.
