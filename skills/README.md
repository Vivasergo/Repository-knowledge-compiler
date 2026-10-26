# RKC agent skills

RKC V2 installs four thin, user-scoped, provider-neutral Agent Skills:

- `rkc-help`;
- `rkc-create-docs`;
- `rkc-update-docs`;
- `rkc-audit-docs`.

The repository copies are package templates. Machine installation materializes
them beneath the user's Agent Skills directory together with metadata that
points to the matching installed core and master-prompt version.

The Claude Code plugin in `plugins/rkc` carries the same skills as
`/rkc:help`, `/rkc:create-docs`, `/rkc:update-docs`, and `/rkc:audit-docs`.
`npm run build:plugin` generates them from these templates with plugin runtime
instructions; edit the templates, not the generated copies.

Skills select and explain an operation. They do not duplicate the complete
documentation protocol, store repository knowledge, or add dependencies to a
target repository.
