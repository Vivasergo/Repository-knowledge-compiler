# Bounded preservation pilot 3: full-R4 control run

Status: unpublished candidate for owner evaluation, not release acceptance.
The previous R2 instructions are historical; use this procedure for pilot 3.

## Candidate and scope

- Branch: `experiment/create-docs-bounded-preservation-2.14`.
- Parent: R2 `018db71830958b643dd8202d0a84778a500102aa`.
- Flow: `RKC-CREATE-FLOW-BOUNDED-PRESERVATION-PILOT-3`.
- Distribution: `2.1.0`, unpublished. The number alone does not identify this
  candidate; compare the Git commit and installed file hashes with the checkout.
- Prompt identifier: `RKC-DOCS-CREATE-2.14`, with candidate content revisions.
  This is not byte-identical to the stable 2.14 prompt.
- Full R4 source baseline: `25c556fdd5f28ea42c0cbff86580fca1dc767029`.
- Existing R2 result: `e587a8f77604161bd1d1208cacfb913ddea26c27`.
- Existing full-R4 release control: `9693bcc81c37189193bbc8d5ebdfc636ec0aaa60`.

The primary researches by default. Maximum five assignments including nested
work and retries; up to three before final QA, two reserved for accuracy and
task usefulness. No per-area mandatory research reviewer. Keep brief notes,
source-grounded findings, faithful transfer and task-based granularity. Preserve
both R2 final QA briefs. No fixed document count, target length or required gaps
details file. Include project-adaptive knowledge preservation and future-agent
code clarity, tests, commit/version/changelog guidance. Help reports skill
availability rather than lists of supported agents.

These are instruction-level constraints, not a runtime ability to count a host's
agents or force semantic correctness. Verify their actual execution in the journal.
Source, dependencies, tests and Git state of R4 remain protected during generation.
Do not supply prior generated docs, reviewer reports or evaluation answers to it.
Existing own-project documents on the selected baseline remain valid research input.

## 1. Build the exact candidate in PowerShell

Run from `C:\For RKC tests` with Node 24 and npm 11. Stop on a failed command;
keep all previous results. The following folder names must be unused.

```powershell
Set-Location 'C:\For RKC tests'
if (Test-Path 'RKC-bounded-r3') { throw 'Candidate folder already exists.' }
git clone --single-branch --branch experiment/create-docs-bounded-preservation-2.14 https://github.com/Vivasergo/Repository-knowledge-compiler.git RKC-bounded-r3
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
Set-Location RKC-bounded-r3
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
$rkcSnapshot = Join-Path 'C:\For RKC tests' ('RKC-before-r3-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
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
if (-not (Select-String -Path (Join-Path $skillRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-BOUNDED-PRESERVATION-PILOT-3' -Quiet)) { throw 'Wrong flow identity.' }
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
if (Test-Path 'R4-full-bounded-r3') { throw 'R4 output folder already exists.' }
git clone https://github.com/Vivasergo/R4-test.git R4-full-bounded-r3
if ($LASTEXITCODE -ne 0) { throw 'R4 clone failed.' }
Set-Location R4-full-bounded-r3
git switch -c rkc-docs-full-bounded-r3 25c556fdd5f28ea42c0cbff86580fca1dc767029
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

## Acceptance and limits

Compare with the existing full-R4 controls on the same source snapshot. Assess
correctness, actionable task routes, meaningful retained conditions and newly
discovered knowledge, alongside time and measured usage. More files are acceptable;
file count is not a quality target. Trace significant losses through original
findings, corrections, transfer and final text. Do not insert those evaluation
answers into the reusable prompt.

This docs-free baseline tests source-derived reconstruction and scale; it does
not by itself prove every existing-document preservation scenario. A favorable
run is evidence for the release decision, not universal compatibility or exhaustive
coverage. Stable main, tags and npm remain unchanged until owner acceptance.
