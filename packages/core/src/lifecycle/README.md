# Installed-runtime lifecycle boundary

This boundary owns deterministic update discovery for the installed RKC V2
runtime. It stores only machine-local update-check state, performs no automatic
installation, and does not read or modify target application code.

Package installation, activation, rollback, version retention, and uninstall
remain in `packages/bootstrap` because they are bootstrap responsibilities.
