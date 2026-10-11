# Final 2.1 candidate: one full-R4 control run

Status: superseded by the final-polish candidate after the completed control run.
No merge, tag or npm publication is authorized by this procedure.

## Candidate and preserved boundaries

- Branch: `release/create-docs-final-2.1`.
- Parent: pilot 4 `f30b9aee490961a03ff578f921efe4a6dafc71fe`.
- Flow: `RKC-CREATE-FLOW-RELEASE-CANDIDATE-5`.
- Package: unpublished `2.1.0`; prompt protocol `RKC-DOCS-CREATE-2.14` with revised
  content. Identify the checkout by the exact commit in the implementation handback
  and compare installed hashes; version/protocol numbers alone are insufficient.
- R4 source: `25c556fdd5f28ea42c0cbff86580fca1dc767029`.
- Pilot-4 comparison result: `c0d181c2bb5cbcff98e235291e7512a5aa8aa9f0`.
- Release-2.0 comparison result: `9693bcc81c37189193bbc8d5ebdfc636ec0aaa60`.

This candidate narrows categorical guardrails, connects allowed value shapes with
consumer/persistence consequences, accounts for small capabilities with distinct
state owners, and preserves significant cross-module reasons for constraints.
It rechecks actual passage text, external uncertainty and clear actionable handbacks
using already loaded evidence. No additional research/QA stage is introduced.
Maximum five assignments, including nested work/retries, and two final QA remain.
Both final QA briefs are unchanged. No file quota or completeness guarantee.

Keep this evaluation procedure and prior results outside the generator workspace.
Do not supply expected topics, past QA findings or prior generated docs to the agent.
Do not install R4 dependencies or modify source during documentation generation.

Run each PowerShell block as a unit. Stop on failure instead of continuing with
later blocks. Timestamped candidate/output folders preserve previous results.

## Implementation validation (2026-10-11)

- `npm run release:check`: passed on Linux, Node 24 / npm 11. Foundation tests:
  35 passed, zero failed, one existing Windows-only test skipped.
- Local packaging and tarball installation, lifecycle and process-kill recovery
  E2E passed. The installed prompt, skills and flow reference match source bytes.
- Final accuracy and task-usefulness QA briefs are byte-identical to pilot 4.
- Prompt changes add about 200 whitespace-separated words, without another
  research/QA phase, evaluation-specific examples or a document-count target.
- Actual generation quality and Windows behavior still require the owner's
  controlled run below. Passing package checks is not proof of semantic coverage.

## 1. Build the exact candidate in PowerShell

Run from `C:\For RKC tests` with Node 24 and npm 11. Stop on a failed command;
keep all previous results. The following folder names must be unused.

```powershell
Set-Location 'C:\For RKC tests'
$rkcRunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$rkcCandidateDirectory = Join-Path (Get-Location) ('RKC-final-2.1-' + $rkcRunId)
if (Test-Path $rkcCandidateDirectory) { throw 'Candidate folder already exists.' }
git clone --single-branch --branch release/create-docs-final-2.1 https://github.com/Vivasergo/Repository-knowledge-compiler.git $rkcCandidateDirectory
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
Set-Location $rkcCandidateDirectory
git rev-parse HEAD
# Require the candidate commit supplied in the implementation handback.
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
npm run pack:local
if ($LASTEXITCODE -ne 0) { throw 'Packaging failed.' }
```

Do not use npm `latest` or self-update to install this experiment.

## 2. Preserve the existing installation, then install

The previous experiment also used `2.1.0`. Existing immutable version bytes must
not be silently reused. Save a backup before confirmed uninstall, which removes
the managed `.rkc` root including retained notes and older versions. This also
provides a reference for reinstalling the previous locally packed candidate;
keep its checkout/tarball separately. Do not overwrite managed paths by hand.

```powershell
$rkcSnapshot = Join-Path 'C:\For RKC tests' ('RKC-before-final-2.1-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path $rkcSnapshot) { throw 'Backup path already exists.' }
New-Item -ItemType Directory -Path $rkcSnapshot | Out-Null
foreach ($relative in @('.rkc', '.agents/skills/rkc-help', '.agents/skills/rkc-create-docs', '.agents/skills/rkc-update-docs', '.agents/skills/rkc-audit-docs')) {
  $source = Join-Path $env:USERPROFILE $relative
  if (Test-Path $source) {
    $target = Join-Path $rkcSnapshot $relative
    New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $target -Recurse -ErrorAction Stop
  }
}
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc uninstall --yes
if ($LASTEXITCODE -ne 0) { throw 'Uninstall failed.' }
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc install
if ($LASTEXITCODE -ne 0) { throw 'Install failed.' }
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc version
if ($LASTEXITCODE -ne 0) { throw 'Version check failed.' }
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc doctor
if ($LASTEXITCODE -ne 0) { throw 'Doctor failed.' }
```

Require version `2.1.0` and healthy installation. Do not continue through an
unmanaged skill collision; keep the evidence instead of deleting unrelated skills.

## 3. Verify installed instructions and runtime

```powershell
$skillRoot = Join-Path $env:USERPROFILE '.agents/skills/rkc-create-docs'
$metadata = Get-Content (Join-Path $skillRoot 'installation.json') -Raw | ConvertFrom-Json
$installedPrompt = Join-Path $metadata.core_path 'documentation/RKC-Documentation-Master-Prompt.md'
if ((Get-FileHash $installedPrompt -Algorithm SHA256).Hash -ne (Get-FileHash 'docs/current/RKC-Documentation-Master-Prompt.md' -Algorithm SHA256).Hash) { throw 'Installed prompt differs.' }
foreach ($skill in @('rkc-help', 'rkc-create-docs', 'rkc-update-docs', 'rkc-audit-docs')) {
  $installedSkill = Join-Path $env:USERPROFILE ".agents/skills/$skill/SKILL.md"
  if ((Get-FileHash $installedSkill -Algorithm SHA256).Hash -ne (Get-FileHash "skills/$skill/SKILL.md" -Algorithm SHA256).Hash) { throw "Installed skill differs: $skill" }
}
$reference = 'references/research-checkpoint-experiment.md'
if ((Get-FileHash (Join-Path $skillRoot $reference) -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path 'skills/rkc-create-docs' $reference) -Algorithm SHA256).Hash) { throw 'Installed flow differs.' }
if (-not (Select-String -Path (Join-Path $skillRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-RELEASE-CANDIDATE-5' -Quiet)) { throw 'Wrong flow identity.' }
$hostSkill = Join-Path $env:USERPROFILE '.claude/skills/rkc-create-docs/SKILL.md'
if ((Get-FileHash $hostSkill -Algorithm SHA256).Hash -ne (Get-FileHash 'skills/rkc-create-docs/SKILL.md' -Algorithm SHA256).Hash) { throw 'Claude skill differs.' }
foreach ($entry in @('research-notes.js', 'research-workspace.js')) {
  $installed = Join-Path $metadata.core_path "node_modules/repository-knowledge-compiler/dist/$entry"
  if ((Get-FileHash $installed -Algorithm SHA256).Hash -ne (Get-FileHash "packages/bootstrap/dist/$entry" -Algorithm SHA256).Hash) { throw "Helper differs: $entry" }
}
$catalog = Join-Path $metadata.core_path 'node_modules/@rkc/core/dist/self-description/catalog.js'
if ((Get-FileHash $catalog -Algorithm SHA256).Hash -ne (Get-FileHash 'packages/core/dist/self-description/catalog.js' -Algorithm SHA256).Hash) { throw 'Help catalog differs.' }
Get-FileHash $installedPrompt -Algorithm SHA256
Get-FileHash (Join-Path $skillRoot $reference) -Algorithm SHA256
```

If successful, restart/refresh Claude Code before a new session. Host UI may
cache old skill instructions even when disk files match.

## 4. Create an isolated full-R4 checkout

```powershell
Set-Location 'C:\For RKC tests'
$r4RunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$r4Directory = Join-Path (Get-Location) ('R4-full-final-2.1-' + $r4RunId)
$r4Branch = 'rkc-docs-full-final-2.1-' + $r4RunId
if (Test-Path $r4Directory) { throw 'R4 output folder already exists.' }
git clone https://github.com/Vivasergo/R4-test.git $r4Directory
if ($LASTEXITCODE -ne 0) { throw 'R4 clone failed.' }
Set-Location $r4Directory
git switch -c $r4Branch 25c556fdd5f28ea42c0cbff86580fca1dc767029
if ($LASTEXITCODE -ne 0) { throw 'Baseline checkout failed.' }
if ((git rev-parse HEAD) -ne '25c556fdd5f28ea42c0cbff86580fca1dc767029') { throw 'Wrong source baseline.' }
if (git status --porcelain) { throw 'R4 worktree is not clean.' }
```

Open only this R4 folder in the fresh generator workspace; keep candidate source,
control results, evaluation reports and backups outside it. Do not put new hints
or expected topics in the generation session. Do not change the source baseline
or install application dependencies as part of this run.

## 5. One full Create run

Use the same host/model/settings as the previous full run where possible. Record
the actual model identifier and reasoning setting displayed by the host; do not
substitute a remembered label. Invoke the installed Create skill through the
host's normal mechanism, for example `/rkc-create-docs` when available.

Approve the normal documentation-only preflight. No extra coaching, research
request, second test, manual correction, commit, push or release is needed during
generation. Record start, approval and final times outside R4. Capture usage/context
before and after when the host exposes it; distinguish total session/subagent usage,
cache accounting and plan counters from per-run billed tokens. Missing metrics
remain unknown, not estimates from file length.

Save the complete journal including nested reviewer responses where export is
available. The final response should name retained notes under `.rkc/temp`.
Confirm no more than five assignments and two distinct final QA passes actually
ran; an instruction to do so is not proof. Fewer research reviewers is acceptable.

## 6. Return evidence without repairing the result

- Complete generated AGENTS/README/docs and any modified documentation routes.
- Full journal, completion response and retained `research.md`, `review.md`,
  `transfer.md`; copy them before another uninstall.
- RKC commit, installed prompt/flow hashes, source baseline, actual host/model/settings.
- Start/approval/end times, available usage evidence, and actual assignment count.
- `git status --short` and `git diff --stat`; note any interruption or source mutation.

Count documents and inspect protected changes in PowerShell:

```powershell
$documents = @('AGENTS.md', 'README.md') + @((Get-ChildItem 'docs/ai' -Recurse -File -Filter '*.md' -ErrorAction SilentlyContinue).FullName)
$presentDocuments = @($documents | Where-Object { Test-Path $_ })
$presentDocuments.Count
git status --short
git diff --stat
git diff --exit-code -- src tests package.json package-lock.json .github deploy
if ($LASTEXITCODE -ne 0) { throw 'Protected tracked files changed.' }
```

The diff check covers tracked paths only; review status for unexpected untracked
product files too. It does not assert that the docs are accurate. Preserve the
result before any later authorized commit/push so the evaluator can compare it.

## Acceptance and release decision

Evaluate the generated passages and actual journal, not only labels in temporary
notes. Check that material rules have evidenced scope and routed exceptions;
value-shape boundaries retain conditions and consequences; meaningful independent
state owners have a task route; external unknowns remain unknown in summaries;
and the owner report links to useful, executable actions without broad claims.
Document/count size is not a score. Record time and real host usage if available;
do not estimate billed tokens from text length or demand an exact minute budget.

Independently sample four implementation plans through generated routes: an editable
field, an allowed-value/eligibility change, an integration action, and a user-specific
setting. Do not implement them or add tests simply for this evaluation. These tasks
are evaluator-only and must not be passed to the generation session.

Require no protected product mutation and no more than five assignments, with both
final QA passes. Preserve exact available reviewer handbacks; distinguish missing
host transcripts from truncated handbacks. Mechanical success is not semantic proof.

Confirmed misleading rules and material contract omissions require correction before
release acceptance. Non-blocking gaps can remain visible, routed maintenance work;
exhaustive initial coverage is not required. Accept or reject against these criteria
instead of beginning another open-ended architecture experiment.

After a favorable result, proceed to the existing 2.1 release preparation and exact
release-candidate checks. Merge/tag/npm publication remain separate owner decisions.

## Completed full-R4 control (2026-10-11)

- Flow: RKC-CREATE-FLOW-RELEASE-CANDIDATE-5.
- Result branch: `rkc-docs-full-final-2.1-20261011-124210`.
- Result commit: `b07e70f0108e77dd93cb0bdb2923aace523c58d0`.
- Source base unchanged: `25c556fdd5f28ea42c0cbff86580fca1dc767029`.
- Five assignments (three research, two QA), about 29 minutes after approval.
- 18 canonical documents (AGENTS + 17 docs/ai), 13,175 whitespace-separated words;
  19 managed files including the root README. Token usage/cost unavailable.
- All 525 source/test blobs match the common source base; changes are docs only.
- Repeat Markdown checks: 19 files, zero issues. Relative links/anchors: 104, zero
  issues. All five delivered handbacks occur verbatim in review.md.
- Local residual issues: category-object/canonical consumer mismatch omitted;
  workflow-stage special save paths described too narrowly; protected handoff route
  obsolete; some previously captured metadata conditions omitted. These are
  benchmark findings, not reusable application-specific generator requirements.
- Owner accepts the richer granularity and informative final response. Final polish
  preserves both, narrows wording and adopts successful-run note cleanup by default.
- No new source research phase, no extra QA assignment and no document quota.

The next control uses `release/create-docs-final-polish-2.1` and flow
`RKC-CREATE-FLOW-RELEASE-CANDIDATE-6`, explicitly retaining temporary notes for
comparison. The release behavior deletes successful-run notes by default.
