# RKC Claude Code plugin

This directory publishes Repository Knowledge Compiler (RKC) as a Claude Code
plugin. The marketplace manifest is
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) at the
repository root; the plugin itself is [`rkc/`](rkc).

The plugin provides the same RKC release as the npm runtime: the four skills,
the version-matched master prompt, the deterministic Markdown checks, and the
temporary research-notes helper used by Create. Only the distribution differs:
Claude Code installs and updates the plugin, and no `npx` installation,
`~/.agents/skills` directory, or npm update notice is involved.

## Requirements

- Claude Code with plugin support.
- Node.js 22 or later on `PATH`. The skills run the bundled helper
  `scripts/rkc.mjs` with `node`; it has no dependencies to install.

## Install for yourself

In Claude Code:

```text
/plugin marketplace add Vivasergo/Repository-knowledge-compiler
/plugin install rkc@repository-knowledge-compiler
```

Or from a shell, fetching only the marketplace and plugin directories:

```sh
claude plugin marketplace add Vivasergo/Repository-knowledge-compiler --sparse .claude-plugin plugins
claude plugin install rkc@repository-knowledge-compiler
```

Append `#<release-tag>` to the repository to pin a release tag that includes
`plugins/rkc`. For a mirror on another Git host, add its clone URL instead of
`owner/repo`.

## Use

Open a target repository in Claude Code and invoke one skill:

- `/rkc:help` — explain RKC, the repository's documentation state, and the
  right next operation;
- `/rkc:create-docs` — create or substantially redesign root `AGENTS.md` and
  routed documentation after one preflight;
- `/rkc:update-docs` — update documentation affected by repository changes;
- `/rkc:audit-docs` — report documentation drift without edits by default.

The skills behave like their npm counterparts (`/rkc-help` and so on). They
refer to operations in the `/rkc:<operation>` form in their answers and in the
documentation they write. Create keeps its temporary research notes in
`~/.rkc/temp`, outside the target repository, and removes them after a
successful run.

## Set up a team repository

To offer the plugin to everyone working in a repository, commit this to its
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "repository-knowledge-compiler": {
      "source": {
        "source": "github",
        "repo": "Vivasergo/Repository-knowledge-compiler"
      }
    }
  },
  "enabledPlugins": {
    "rkc@repository-knowledge-compiler": true
  }
}
```

Add `"ref": "<tag>"` next to `"repo"` to pin a release. Claude Code applies
these settings after each teammate trusts the repository folder; anyone who
does not have the plugin yet can install it from `/plugin`. This is optional
host configuration: RKC itself adds no dependencies or state to the target
repository.

## Update and remove

The plugin version equals the RKC release version. Claude Code updates an
installation only when that version changes.

- Turn on auto-update for the marketplace in `/plugin` → **Marketplaces**, or
  update manually with `claude plugin marketplace update
repository-knowledge-compiler` followed by
  `claude plugin update rkc@repository-knowledge-compiler`. A running session
  keeps its loaded version until `/reload-plugins` or the next session.
- Remove the plugin with
  `claude plugin uninstall rkc@repository-knowledge-compiler` and the
  marketplace with
  `claude plugin marketplace remove repository-knowledge-compiler`. Removing
  the plugin does not change repository documentation or `~/.rkc/temp`.

## Plugin and npm installation together

Both distributions can be installed on one machine, but they are separate
copies that may be at different versions: `/rkc-help` comes from the npm
runtime and `/rkc:help` from the plugin. Choose one per machine. Note that
`npx repository-knowledge-compiler@latest uninstall` removes `~/.rkc`,
including research notes retained by the plugin.

If you installed an earlier hand-made RKC plugin, uninstall it first; any other
plugin named `rkc` provides conflicting `/rkc:*` skills.

## Maintain the plugin

`plugins/rkc` is generated; do not edit it by hand. `npm run build:plugin`
assembles it from:

- `skills/` — the canonical skill templates, adapted by the exact transforms
  in `scripts/claude-plugin-files.mjs`;
- `docs/current/RKC-Documentation-Master-Prompt.md` — copied unchanged;
- `packages/core` and the plugin runtime in
  `packages/bootstrap/src/plugin-cli.ts` — compiled JavaScript under
  `runtime/`;
- `scripts/claude-plugin-entry.mjs` — the `scripts/rkc.mjs` entry.

`npm run check` fails when the committed plugin differs from that output, and
`npm run test:e2e:plugin` runs a copy of the committed plugin the way Claude
Code does. Use `claude plugin validate --strict .` and
`claude plugin validate --strict plugins/rkc` after manifest changes.
