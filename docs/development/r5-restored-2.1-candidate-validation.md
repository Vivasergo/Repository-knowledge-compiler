# R5-restored 2.1: controlled generation

Unpublished candidate; branch `release/create-docs-r5-restored-2.1`.
Flow `RKC-CREATE-FLOW-RELEASE-CANDIDATE-9`; package `2.1.0` and prompt
protocol `RKC-DOCS-CREATE-2.14` remain unchanged. Pin the exact remote commit
from the implementation handback, not the version number.

## Patch boundary

Restore candidate-5 master content before FINAL REPORT and flow sections
1–5 (research, assembly, transfer and both QA briefs). Only the new flow
identity and note-policy wording differ in these sections. Keep the later
substantive final report, successful-note deletion with explicit retention,
Windows canonical-path fix and existing runtime/lifecycle safety.
No new granularity preference, file quota, research stage or QA pass.
No application-specific expected answers enter reusable instructions.

Local semantic assertions must compare these exact R5 source sections with
`f67aa4a549e9b2deedbdd1b2aae15c8bf5f16bd3`. Preserve the existing eight-file
candidate boundary: master, Create skill/reference, runtime flow identity,
installation expectation, changelog, prior validation supersession and this
procedure. Generated application docs are not changed by this patch.

## Control isolation

Run the blocks as units in one PowerShell session and stop on error. Keep
prior controls and retained notes outside the generator workspace. This
procedure does not publish npm, merge or tag. Backup before uninstall is
required because earlier experiments used the same local version 2.1.0.
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
$rkcCandidateDirectory = Join-Path (Get-Location) ('RKC-r5-restored-2.1-' + $rkcRunId)
if (Test-Path $rkcCandidateDirectory) { throw 'Candidate folder already exists.' }
git clone --single-branch --branch release/create-docs-r5-restored-2.1 https://github.com/Vivasergo/Repository-knowledge-compiler.git $rkcCandidateDirectory
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

## 2. Preserve the existing installation, then install

The previous experiment also used `2.1.0`. Existing immutable version bytes must
not be silently reused. Save a backup before confirmed uninstall, which removes
the managed `.rkc` root including retained notes and older versions. This also
provides a reference for reinstalling the previous locally packed candidate;
keep its checkout/tarball separately. Do not overwrite managed paths by hand.

```powershell
$rkcSnapshot = Join-Path 'C:\For RKC tests' ('RKC-before-r5-restored-2.1-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
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
if (-not (Select-String -Path (Join-Path $skillRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-RELEASE-CANDIDATE-9' -Quiet)) { throw 'Wrong flow identity.' }
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
$r4Directory = Join-Path (Get-Location) ('R4-full-r5-restored-2.1-' + $r4RunId)
$r4Branch = 'rkc-docs-full-r5-restored-2.1-' + $r4RunId
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

Use the same host/model/settings as the R5 control where possible. Record
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
generation session. Evaluate the raw result against R5
`b07e70f0108e77dd93cb0bdb2923aace523c58d0` on source base `25c556f`.
R5 has 18 canonical AGENTS/docs files and 13,175 whitespace words; these are
observations, not a quota or acceptance score. Require material task routes,
conditions, exceptions and persistence/integration boundaries at least at
R5's useful level; compare actual passages to source. Preserve external
unknowns as unknown, protected source unchanged, at most five assignments,
both final QA passes and mechanical checks. Record actual host/model/settings
and duration/usage where available; do not estimate billed tokens from words.
A favorable control permits release preparation only; merge/tag/npm still
need the owner's separate decision.
