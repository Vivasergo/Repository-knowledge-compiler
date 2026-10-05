# Research checkpoints and faithful transfer experiment

Identity: `RKC-CREATE-FLOW-RESEARCH-CHECKPOINT-PILOT-2`.

Contents: [workspace](#working-files-and-continuity), [research](#1-map-and-research),
[research review](#2-review-research-before-drafting), [transfer](#3-transfer-and-document-granularity),
[assembly and QA](#4-assembly-and-two-final-qa), [completion](#5-completion-and-retention).

Keep master `RKC-DOCS-CREATE-2.14` unchanged. Replace its execution order,
research-note prohibition, operation-wide assignment ceiling and default QA
allocation only as stated here. Preserve its content selection, evidence rules,
English documentation, source protection, single preflight and completion rules.
No benchmark answers, previous evaluation reports or repository-specific expected
topics may enter research or reviewer briefs.

## Working files and continuity

After the master's ordinary preflight approval, before substantive research,
automatically run the installed helper with quoted platform paths:

```text
node "<core_path>/node_modules/repository-knowledge-compiler/dist/research-notes.js" start "<target-root>" "<checked-revision>"
```

Resolve `core_path` from this skill's installation metadata. Obtain the actual
source revision read-only; for uncommitted input record its worktree evidence
boundary too. Do not invent a revision when Git evidence is unavailable: use an
explicit unavailable-revision description and disclose the limit. The helper
creates a unique user-scoped `.rkc/temp/create-docs-<run>/` adjacent to `versions/`,
never inside the project or installed version. This authorized local RKC helper
is not target-application execution. Preserve its ownership marker and provenance
at the top of each of the three files:

- `research.md`: coverage map, original findings with evidence, exclusions,
  unchecked edges and next area. Append findings before shortening or drafting.
- `review.md`: complete original research/final QA responses, separate verified
  corrections, readiness decisions, seam checks and actual mechanical results.
- `transfer.md`: each material finding's canonical passage or justified exclusion,
  retention of conditions, assembly/QA rechecks and final completion status.

Use ordinary Markdown, short area headings and local finding labels for reference.
Do not build a semantic schema, one record per function, source dumps or a new
project knowledge manifest. Preserve material evidence rather than verbatim code.
Copy reviewer responses completely; a paraphrase is not the original review.
Record corrections separately instead of rewriting the original findings/reviews.
Do not copy secrets or unrelated private content into notes.

Checkpoint after each research area, review/correction, transfer and final QA.
Before continuing, read the relevant saved section and outstanding edges; after
context loss read provenance and coverage first. Reconcile the repository,
revision and worktree boundary before reuse. Changed evidence requires a targeted
recheck of affected findings; a different repository/revision never silently
inherits a completed status. If persistence fails, retain available evidence,
report the blocked checkpoint and do not claim this flow completed in memory.

## 1. Map and research

During read-only orientation, map meaningful responsibilities and their
relationships, source entry points, tests, existing documents and missing source.
Present one concise preflight; ordinary approval covers documentation and these
external working files. Respect prior session authorization; no area approvals.

After approval, develop the map while researching small coherent areas
sequentially. An area follows a responsibility and the relationships needed to
understand it, including immediate implementations, consumers and relevant tests.
Split an area when distinct conditions or too many relationships prevent reliable
checking. Directories and byte sizes help locate or bound reading; they do not
define semantic boundaries. Do not cap area/file counts or hide leftover scope
to meet an arbitrary quota. On large inputs, checkpoint and review areas
incrementally rather than waiting for all source to fit in one context.

For each area, read whole relevant implementations, not only search hits.
Trace entry conditions, alternate branches, exceptions, observable outcomes,
owners, shared dependencies and cross-area connections that change a future
implementation decision. Check test setup and assertions: names, imports and
fixtures alone do not establish the claimed coverage or runtime guarantees.
Challenge broad statements with reachable counterexamples and qualify them by
the conditions actually established. Keep observed behavior, inference, likely
defects, external guarantees and intent distinguishable.

Save consequential findings with rule, conditions/exceptions, outcome, source
path/symbol and evidence boundary. Preserve distinctions before condensation;
shared helpers or similar names do not establish equivalent behavior. Inventory
every relevant source area as researched, excluded with reason, or unchecked with
an explicit limit; listing a file is not reading it. Record outgoing edges and
existing documentation not yet reconciled. Do not require every local detail to
become a finding; select knowledge that would change a realistic task or prevent
a material mistake. Do not draft final topical prose before the research gate.

## 2. Review research before drafting

For each area, give a fresh read-only reviewer the brief below, source entry
points, original findings, the coverage map including residual/excluded scope,
actual revision and worktree baseline. Include nearby relationships required to
judge the area, not unrelated repository dumps or anticipated evaluation answers.
Run one assignment at a time. Do not have the researcher write the reviewer's
conclusions for it. This replaces the previous pilot's combined draft checker:
the reviewer checks research before prose can steer what appears important.

### Research reviewer brief

Read the assigned primary implementations, immediate consumers, relevant test
setup and existing documents. Check two directions separately:

1. Included findings: verify consequential rules, their conditions, exceptions,
   outcomes and evidence strength. Look for counterexamples to categorical claims,
   unsupported equivalence, inference presented as fact and overstated tests.
2. Residual sources: inspect relevant excluded/unrepresented implementations,
   branches, consumers, tests and existing documents. Identify consequential
   knowledge absent from findings or a boundary that makes an exclusion unsound.
   An unread area cannot be marked covered because its directory was inventoried.

Existing documentation supplies leads, not authority over current implementation.
Report confirmed discrepancies or justified adequacy, primary source anchors,
required additions/qualifications and remaining unchecked scope. Do not invent
omissions to meet a quota or require exhaustive transcription. Modify no files,
execute no application code, install nothing and contact no external systems.

### Research readiness checkpoint

Save the complete response in `review.md`. Source-verify suggested corrections,
append corrected/additional findings with their relationship to originals, and
resolve affected edges in the coverage map. Use one correction cycle per area,
with targeted primary source rechecks. Agreement between agents is not evidence.

Mark the area ready only when material findings have evidence and preserved
conditions, review issues are resolved, and residual scope has been checked,
justifiably excluded or explicitly bounded. A known consequential omission or
false rule blocks drafting that area. Unavailable evidence stays a visible limit;
do not count it as verified coverage. Record the readiness basis, not just PASS.
If independence is unavailable, perform the separate source pass yourself and
disclose that limitation. Do not silently add repeated complete research sweeps.

## 3. Transfer and document granularity

Read the area's original findings, corrections and readiness decision from disk
before drafting. Transfer checked knowledge into canonical documents under the
master's task routes. Keep conditions and limits with the actual claim.

Choose files by distinct reader tasks, responsibility and evidence scope. Split
when materially different contracts or verification routes would be buried in
one document; use sections when a single task needs the related knowledge
together. Research areas are not output files. Do not impose a document quota,
target length or one-file-per-area rule; do not merge distinct behavior to make
the surface look smaller. Keep every substantive document reachable from the
router; avoid duplicated canonical rules.

In `transfer.md`, give every material finding, including review additions, an
individual disposition: actual document/section and the retained rule with its
conditions, or a concrete reason for exclusion consistent with the master's
knowledge selection. A shared heading, list of finding labels, vague RETAINED
status or source link alone is not evidence that the passage preserves knowledge.
Do not exclude a consequential finding just because it is recoverable from code.

Perform a separate primary transfer pass using saved findings/corrections and
actual text. Check conditions, exceptions, outcomes and evidence limits for each
disposition; inspect the source again where wording changed meaning. Re-read
relevant scope exclusions so shortening cannot silently discard an unresolved
edge. Resolve confirmed losses before assembly; leave honest unknowns visible
in the corresponding documentation. This pass is not another full research run.

## 4. Assembly and two final QA

Assemble canonical homes, root AGENTS, concise README navigation and task routes.
Check material cross-area seams against both sides: ownership, inputs/outputs,
identities/units, ordering, registration, defaults, errors and evidence limits.
Preserve distinct cases. Record changed passages in `transfer.md` and recheck
their original findings; rearranging or shortening is not automatically harmless.
Use a separate read-only seam reviewer only for a material connection the primary
cannot settle; do not manufacture a seam or redundant summary assignment.

Run two fresh read-only final QA assignments sequentially on the assembled docs.
Supply actual document paths, source entry points, revision, limits and protected
worktree baseline. Do not supply author conclusions as expected answers.
Preserve complete reviews in `review.md`. Correct confirmed issues and check
affected passages/source once between reviews and after the second.

### Accuracy QA brief

Check actual entry points, routes and consequential claims against primary source
and test setup. Verify conditions, exceptions, seams and evidence strength;
challenge categorical statements. Inspect a bounded high-impact source area
missing from document headings when the coverage map supports it. Return
confirmed discrepancies or supported adequacy, source/passage anchors, severity,
narrow corrections and unchecked scope. Do not rediscover the whole repository,
modify files or perform unauthorized execution.

### Task-usefulness QA brief

Choose a realistic maintenance task from source before reading the topical prose;
choose a second only for a materially different responsibility. Follow AGENTS and
routes to owners, implementation constraints and meaningful verification. Inspect
source to judge whether the docs lead to a correct plan and retain constraints
that change it. Return task outcome, source/passage anchors, narrow corrections
and limits. Do not implement the task or perform unauthorized execution.

Use one research reviewer per area, optional material seam review and these two
final reviewers; this replaces the master's global assignment ceiling. Keep
assignments sequential, consolidate overlapping areas and avoid repeated summaries
or full reruns. For the first small packet aim for one or two areas based on
actual responsibilities; do not omit a necessary third to satisfy a number.
Disclose unavailable independence rather than implying a reviewer ran.

Run the master's mechanical checks over every created/modified managed document,
including untracked files. Record actual results, not inferred execution.

## 5. Completion and retention

Before recording success, revisit `transfer.md` after both QA corrections. Each
material finding must still have a correct published passage or justified
exclusion; all necessary seams, source scope and unresolved limits must be
accounted for. Carry reader-relevant uncertainty into docs and material readiness
limits into the handback. Complete the master's source-protection and mechanical
checks. Append actual completion/revision/review status to the three notes.

Only after these gates succeed run:

```text
node "<core_path>/node_modules/repository-knowledge-compiler/dist/research-notes.js" finish "<run-path>" retain --verified
```

This experiment retains notes automatically for evaluation. Name their exact
folder in the final response; the owner need not ask for them. On interruption,
blocked gate or failed checks, keep notes and record the last reliable checkpoint;
do not invoke successful finish. Never erase another run or reuse stale status.

The helper also supports `delete` in place of `retain` for an accepted ordinary
flow after all gates, or explicitly authorized disposal of an evaluated run.
Do not select `delete` during this experiment. It validates owned paths/files and
never recursively removes the parent, siblings or installed versions. The helper
manages storage; `--verified` is the agent's assertion, not an automated semantic
quality verdict. State semantic and packaging validation separately.
