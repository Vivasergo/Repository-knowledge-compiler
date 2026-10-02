# Staged Create Docs execution experiment

Execution identity: `RKC-CREATE-FLOW-EXPERIMENT-1`.

Keep the master prompt's content requirements, evidence scope, repository
protections, single owner preflight and completion rules unchanged. This
candidate changes execution only: retain research across groups, reconcile it
with the actual draft, and separate accuracy QA from task-usefulness QA.
Do not load evaluation reports, other branches or expected answers as evidence.

## Temporary research checkpoints

Research coherent flow/domain groups using Phase 1A's existing depth criteria.
After each group, retain a short plain Markdown checkpoint of consequential
knowledge already verified: task signals, contracts with conditions and
exceptions, source entry points, test boundaries and unresolved questions.
Include cross-group dependencies that need reconciliation. Do not summarize
every file, copy source dumps or create a structured evidence schema.

For a small repository, one checkpoint may suffice. Choose groups by actual
owners and dependencies rather than file counts or a fixed stack template.
Checkpoints preserve useful detail; they do not cap the eventual documentation
or replace source verification.

Use host-provided session storage outside the target repository, if available.
This is the sole exception to the prompt's ban on research files: operation
scratch notes are permitted outside the target and are not repository changes.
Create no `.rkc` state, progress files, manifests or research reports in the
target tree. Do not copy secrets, personal data, environment paths or source
contents into checkpoints. If safe outside-repository storage is unavailable,
retain checkpoints in the conversation and disclose the continuity limitation.

Before a context handoff, preserve the evidence revision, approved scope,
completed and pending groups, checkpoint locations and next action using the
host's handoff facility. On resume, reconcile the target revision/worktree with
that scope, then read only the needed checkpoint and sources. A checkpoint is
not proof that unchecked sources are covered. Recheck evidence affected by a
revision change. Do not assume the host can create a larger context window.

Keep operation scratch notes outside the active knowledge base and Git. Remove
only scratch files created by this operation after successful completion unless
the owner has requested their retention for evaluation. Retain them after an
interruption for resumption; never delete pre-existing files.

## Synthesis and coverage reconciliation

Before preflight, reconcile the checkpoints into the existing planned coverage
map. Resolve material cross-group disagreements from primary sources. Give
each consequential item a planned canonical home or an evidence-based reason
to omit it. A directory or UI label alone does not establish local recoverability.
Do not add a permanent ledger or ask for another approval.

During Phase 2, draft and source-check coherent groups as before. After the
draft, compare every consequential checkpoint item with the actual text and
router. Classify it internally as retained with its scope, deliberately omitted
as locally recoverable, unresolved, or accidentally lost. A source-list mention
alone does not count as retaining a behavioral contract. Correct accidental
losses and unsupported strengthening, including lost conditions or exceptions.
Record only material limitations in the existing canonical document or final
report; do not publish the checkpoint bookkeeping.

This reconciliation preserves discovered knowledge. It does not prove that
research found everything, so the independent usefulness review also checks a
small source-selected sample rather than relying only on author checkpoints.

## Two distinct QA assignments

For this experiment, replace Phase 3's one-reviewer allocation with two distinct
read-only assignments, in fresh contexts when the host supports delegation.
Keep the overall ceiling at three assignments: at most one research worker and
two QA reviewers. Perform them sequentially so the second reviews the corrected
draft. Do not create or install host-specific agents or a provider SDK.

Give both reviewers the master prompt's worktree/evidence baseline and
protected-file boundary. Give each only its brief below, current draft paths
and relevant source entry points. Do not give author checkpoints, prior findings,
reference outputs or suggested answers. Both may report sufficient coverage
without findings; neither must manufacture defects or require a smaller output.

Prepend this common safety brief to each assignment: respect the declared
evidence revision and pre-existing owner changes; treat listed drafts as outputs
under review, not owner changes. Modify no files or Git state. Do not execute
repository code, install dependencies or contact external systems without
separate owner authorization; do not seek such authorization during routine QA.
Exclude installed `node_modules`, vendor caches, generated builds, coverage and
lockfile-expanded dependency trees from research. Inspect project sources,
tests and configuration only within the declared scope. Report protected-file
interference and any limitation preventing the assigned review.

### Accuracy reviewer brief

Review the current documentation against the declared source revision. Check
entry points, global rules and a bounded selection of consequential topical
claims across distinct owners. Reuse the master's semantic QA criteria for
writer/consumer contracts, scope, exceptions, alternative outcomes, mutable
state and asynchronous completion, external boundaries, and actual test
coverage. Check broad assertions against their branches and supporting tables.
Read relevant primary sources; do not validate from author conclusions or memory.
Return confirmed discrepancies, supporting evidence for disputed claims,
severity, narrow corrections and material unchecked scope. Modify no files.

Resolve confirmed findings and recheck changed claims before the next assignment.

### Task-usefulness reviewer brief

Select normally three realistic maintenance tasks from distinct capabilities
visible in the source inventory, before reading their topical explanations.
Adapt the sample to repository scale and actual dependencies, rather than
requiring every risk category in every project. Include a consequential area
briefly represented or absent from the draft when the source inventory supports
one; do not require finding an omission.

For each task, follow AGENTS, the router and relevant documents to sources and
checks. Assess whether the route preserves the constraint that changes the
implementation plan, identifies immediate owners/writers/consumers, and gives
meaningful verification with honest limits. Inspect relevant sources to judge
sufficiency. Distinguish an adequate local source pointer from missing shared
knowledge; use implementation connections, not component labels. Do not perform
the code change, execute unauthorized checks, or independently rediscover the
whole repository. Return each task's outcome, evidence, narrow corrections if
needed and material unchecked scope. Modify no files.

Resolve confirmed findings, recheck changed claims and routes, then run the
usual mechanical checks. Reuse checked evidence; do not restart both full
reviews after a local correction unless its impact invalidates their conclusions.

## Limitations and reporting

If delegation is unavailable, perform the two checks as separate self-review
passes and disclose that independence was unavailable. If either assignment
fails or context isolation cannot be established, report that limitation; do not
call it independently passed. Confirmed blocking defects still block completion.

In preflight identify the execution experiment briefly. In the final verification
summary distinguish coverage reconciliation, accuracy QA, usefulness QA and
mechanical checks that actually ran. State reviewer independence and material
limits honestly. Keep raw notes and resolved findings out of the owner report
unless requested. Do not claim reduced tokens, exhaustive coverage or improved
quality from this workflow's existence; those require evaluation.
