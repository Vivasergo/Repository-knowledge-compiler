# R7-restored 2.1: controlled generation

Unpublished candidate; branch `release/create-docs-r7-restored-2.1`.
Flow `RKC-CREATE-FLOW-RELEASE-CANDIDATE-10`; package `2.1.0` and prompt
protocol `RKC-DOCS-CREATE-2.14` remain unchanged. Pin the exact remote commit
from the implementation handback, not the version number.

## Patch boundary

Restore candidate-7 master content before FINAL REPORT, its research/assembly/QA
flow and its thin Create skill from `18f0a1258ee3a6761fed239067dfe1f7c4718390`.
Keep the later substantive final report, successful-note deletion with explicit
retention, Windows canonical-path fix and existing runtime/lifecycle safety.
Add one provider-neutral clarification: sharing a writer API does not establish
coverage of a capability's material edit/delete, gating, async and persistence
conditions. Reuse existing research/transfer checks; add no phase or QA pass.
No file quota or application-specific expected answers enter generation.

Local semantic assertions compare the exact R7 master prefix, whole reference
(with only identity and the stated clarification), and thin skill (identity only).
The two final QA briefs remain byte-identical to R7. Validate unchanged package
lockfile and retained installation test except for its flow identity.
Generated application docs are not changed by this patch.

## Control isolation

Run the blocks as units in one PowerShell session and stop on error. Keep
prior controls and retained notes outside the generator workspace. This
procedure does not publish npm, merge or tag. The owner explicitly requested
a reinstall without a backup; do not copy the old runtime or skills.
The new branch name is an identity, not proof that documentation quality is
restored. That requires the independent full control.

## 1. Build the exact candidate in PowerShell

Run from `C:\For RKC tests` with Node 24 and npm 11. Stop on a failed command;
keep all previous results. The following folder names must be unused.

```powershell
Set-Location 'C:\For RKC tests'
$rkcExpectedCommit = '<exact remote SHA from the implementation handback>'
if ($rkcExpectedCommit -notmatch '^[0-9a-f]{40}$') { throw 'Set the exact candidate SHA first.' }
$rkcRunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$rkcCandidateDirectory = Join-Path (Get-Location) ('RKC-r7-restored-2.1-' + $rkcRunId)
if (Test-Path $rkcCandidateDirectory) { throw 'Candidate folder already exists.' }
git clone --single-branch --branch release/create-docs-r7-restored-2.1 https://github.com/Vivasergo/Repository-knowledge-compiler.git $rkcCandidateDirectory
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
Set-Location $rkcCandidateDirectory
git rev-parse HEAD
if ((git rev-parse HEAD) -ne $rkcExpectedCommit) { throw 'Wrong candidate commit.' }
npm ci
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
npm run release:check
if ($LASTEXITCODE -ne 0) { throw 'Release checks failed.' }
```

Do not use npm `latest` or self-update to install this experiment.

## 2. Reinstall without a backup

Close old Claude Code sessions before uninstall. Use the candidate tarball built
above to remove the managed old installation and install fresh candidate bytes.
Do not copy `.rkc`, installed skills or old versions. Uninstall removes the complete
managed runtime, including temporary retained notes; previous control evidence
already submitted separately is sufficient. Repository docs remain in their
repositories. If uninstall reports a collision or refuses a path, stop and retain
the error instead of deleting unrelated skills by hand.

```powershell
$rkcTarball = Join-Path $rkcCandidateDirectory 'artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz'
if (-not (Test-Path $rkcTarball)) { throw 'Candidate tarball missing.' }
npx --yes --package $rkcTarball rkc uninstall --yes
if ($LASTEXITCODE -ne 0) { throw 'Uninstall failed.' }
npx --yes --package $rkcTarball rkc install
if ($LASTEXITCODE -ne 0) { throw 'Install failed.' }
npx --yes --package $rkcTarball rkc version
if ($LASTEXITCODE -ne 0) { throw 'Version check failed.' }
npx --yes --package $rkcTarball rkc doctor
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
if (-not (Select-String -Path (Join-Path $skillRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-RELEASE-CANDIDATE-10' -Quiet)) { throw 'Wrong flow identity.' }
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
$r4Directory = Join-Path (Get-Location) ('R4-full-r7-restored-2.1-' + $r4RunId)
$r4Branch = 'rkc-docs-full-r7-restored-2.1-' + $r4RunId
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
control results, evaluation reports outside it. Do not put new hints
or expected topics in the generation session. Do not change the source baseline
or install application dependencies as part of this run.

## 5. One full Create run

Use the same host/model/settings as the R7 control where possible. Record
the actual model identifier and reasoning setting displayed by the host; do not
substitute a remembered label. Invoke the installed Create skill through the
host's normal mechanism, for example `/rkc-create-docs` when available.

Before generation, explicitly request: "For this control run, retain research.md,
review.md and transfer.md in the temporary run folder after successful completion.
Do not add files to the project for this request." Then approve the normal
documentation-only preflight. No application-specific coaching, research
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

## Evaluator-only acceptance

Do not send this section, comparison reports or prior generated docs to the
generation session. Evaluate the raw result against R7
`9ca0e5f6229d8c391467030ed5d23a48d0d37ead` on source base `25c556f`.
R7 has 30 canonical AGENTS/docs files and 17,368 whitespace words; these are
observations, not a quota or acceptance score. Require independently routed
responsibilities and preservation of task-changing conditions, exceptions,
edit/delete behavior, async outcomes and persistence/integration boundaries.
Inspect actual passages rather than accepting a shared writer or a retained label
as coverage. Preserve improvements found in later controls where source-supported.
Compare to primary source, retain external unknowns, protect source, keep at most
five assignments and both final QA passes. Record actual host/model/settings and
duration/usage where available; do not estimate billed tokens from words.
A favorable control permits release preparation only; merge/tag/npm still
need the owner's separate decision.
