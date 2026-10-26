# RKC Claude Code plugin (generated)

Do not edit files in this directory. `npm run build:plugin` regenerates it
from the RKC repository sources:

- `skills/`: the canonical skill templates, adapted by the exact transforms
  in `scripts/claude-plugin-files.mjs`;
- `docs/current/RKC-Documentation-Master-Prompt.md`: copied unchanged;
- `packages/core` and `packages/bootstrap/src/plugin-cli.ts`: compiled
  into `runtime/`;
- `scripts/claude-plugin-entry.mjs`: copied to `scripts/rkc.mjs`.

Change those sources, run `npm run build:plugin`, and commit both.
`npm run check` fails when this directory differs from the generated output.
Installation, team setup, and updates are described in `plugins/README.md`
of the RKC repository.
