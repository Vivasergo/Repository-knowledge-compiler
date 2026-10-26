# Contributing to RKC

## License and contribution rights

RKC's public code, installed skills, master prompt, and documentation are
licensed under the [MIT License](LICENSE). Contributors retain the copyright
to their own original contributions. By submitting a contribution for inclusion
in RKC, you agree that it may be distributed under the repository's MIT
License and confirm that you have the rights needed to grant that permission.
Do not submit confidential material or code owned by an employer, customer, or
another project without authorization. RKC does not require copyright
assignment or a contributor license agreement for this release.

## Required checks

Use Node.js 24 and npm 11. Before proposing a change, run:

```bash
npm ci
npm run check
```

Run the package lifecycle checks when changing installation, packaging, skills,
or installed runtime behavior:

```bash
npm run pack:local
npm run test:e2e:install
npm run test:e2e:lifecycle
npm run test:e2e:process-kill
```

None of these commands publishes to npm.

The Claude Code plugin in `plugins/rkc` is generated from `skills/`, the master
prompt, `packages/core`, and the plugin runtime in `packages/bootstrap`. After
changing any of them, regenerate and commit it:

```bash
npm run build:plugin
npm run test:e2e:plugin
```

`npm run check` fails when the committed plugin differs from its sources. When
a canonical skill change breaks an exact transform in
`scripts/claude-plugin-files.mjs`, review the plugin wording and update the
transform; do not loosen it.

## Versioning and changelog

Only `packages/bootstrap` is published as `repository-knowledge-compiler`.
The root workspace and `@rkc/core` are private and their `0.0.0` versions do
not determine the product release version.

Until the first public `2.0.0` release, commits refine the same release
candidate; do not bump SemVer for each commit. Keep the `2.0.0` section of
[CHANGELOG.md](CHANGELOG.md) accurate for material user-facing changes. Finalize
the exact commit, run release validation, and tag `v2.0.0` when publishing is
approved.

After publication, record material user-facing changes under `Unreleased` in
the changelog. For the next npm release, choose a version using SemVer:
`PATCH` for compatible fixes, `MINOR` for compatible new functionality,
and `MAJOR` for incompatible changes. Move the relevant entries into the new
version section, update the published package version and lockfile, validate
the exact release commit, then tag and publish that version.

The Claude Code plugin uses the package version from
`packages/bootstrap/package.json`. Claude Code delivers plugin changes to
existing installations only when that version changes, so plugin-content
changes reach them with the next release; new installations from `main` receive
the current generated plugin.

A Git commit does not automatically require an npm release. Repository-only
changes may stay in Git; changes to files shipped in the npm package, such as
the package README, need a new version if they are to reach npm users after
`2.0.0` is published. Do not reuse or overwrite a published version.

## Architectural rules

1. Use the root `README.md` for product scope and the versioned
   `docs/current/RKC-Documentation-Master-Prompt.md` for creation behavior;
   check the implementation and tests for actual behavior.
2. Keep skills thin and provider-neutral. Canonical documentation-creation
   behavior belongs to the master prompt, not duplicated adapter logic.
3. Keep permanent repository knowledge in Markdown. Do not reintroduce a
   knowledge manifest, semantic IR, graph, database, or provider SDK without an
   approved observed need.
4. Keep target repositories free of RKC runtime dependencies and development
   packages.
5. Preserve user-owned worktree changes and the documented mutation boundaries.
6. Deterministic checks may validate structure and evidence but must not present
   inference as verified repository truth.
7. Never commit secrets, generated `dist` output, package tarballs, caches, or
   target-repository artifacts. The sole exception is the generated Claude Code
   plugin in `plugins/rkc`, which must match `npm run build:plugin` output.
8. Public npm publication requires a separate owner decision.
