# RKC development fixtures

`stage-4/` contains two small, repository-neutral projects used only by the V2
package installation and lifecycle tests:

- a Node.js monorepo;
- a Python worker with infrastructure configuration.

Tests copy these fixtures into operating-system temporary directories. They
never mutate the canonical fixture sources in place and never install RKC as a
dependency of a target project.
