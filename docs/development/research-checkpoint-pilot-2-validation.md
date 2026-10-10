# Research checkpoint pilot 2: implementation and P02 candidate R2

Historical R2 record. The next candidate and full-R4 instructions are in
[bounded-preservation-pilot-3-validation.md](bounded-preservation-pilot-3-validation.md).
Do not use the installation hashes or next-run instructions below for pilot 3.

Status: unpublished candidate. Packaging/lifecycle validation is separate from
semantic acceptance, which requires the owner run below.

## Identity and retained work

- Branch: `experiment/create-docs-research-checkpoints-2.14`, from release main
  `516aebddbf79a775ce9f8156a383a570f04e59c7`.
- Flow: `RKC-CREATE-FLOW-RESEARCH-CHECKPOINT-PILOT-2`.
- Local distribution: `2.1.0`, unpublished; version alone cannot distinguish
  earlier experiments. Verify installed instruction/reference/helper bytes.
- Master: `RKC-DOCS-CREATE-2.14`, unchanged SHA256
  `781eb552765706b35d28ce7f445510baf3b3280aff15a0aebb42915e9ab8c948`.

Retain the release master/evidence boundaries, research by coherent source areas,
source/passage checks, cross-area seams and two final QA passes. Replace pilot 1's
research/draft/combined local checker order with saved research, independent
research review including residual sources, readiness checkpoint, drafting and
separate transfer check. Neither research areas nor output files have a quota.
This is one combined mechanism experiment, not an attribution study of five
separate changes. It makes no claim that every added rule improves quality.

Changed functional files:

- `skills/rkc-create-docs/SKILL.md`: activate the new reference automatically.
- `skills/rkc-create-docs/references/research-checkpoint-experiment.md`: research,
  readiness, transfer, granularity, assembly, final QA and retention instructions.
- `packages/bootstrap/src/research-workspace.ts` and `research-notes.ts`: create
  three durable Markdown working files in a unique user-scoped run and safely
  retain/remove owned notes. No semantic evaluator or target-project state.
- `scripts/assemble-bootstrap-payload.mjs` and `test-e2e-install.mjs`: package and
  actually execute the installed helper; verify both installed skill locations.
- Bootstrap package/version/lock and existing version-sensitive fixtures:
  distinguish unpublished 2.1.0 from release 2.0.0, as in pilot 1.

The helper's verified flag represents the caller's completion assertion. It does
not prove source coverage or faithful transfer. These are agent checks whose
execution and result must be visible in saved notes and the session journal.

## One next semantic run

Run only a fresh P02 candidate R2 with the same host/model/settings and ordinary
preflight approval. Keep existing P02 release R1 and candidate R1 results as
controls; do not rerun them now. Use no previous docs, reviewer reports, expected
answers or evaluation files in the generator's workspace. Do not coach the run
with additional requests for notes, topics or missing findings.

The evaluator's frozen P02 manifest defines 15 files / 83,593 bytes at source
revision `25c556fdd5f28ea42c0cbff86580fca1dc767029`. This is a statically readable
packet, not a runnable application. Its origin is distinct from the local packet
Git commit. No application execution/dependency installation is authorized.

Use the existing test root containing `R4-evaluator`, normally
`C:\For RKC tests\RKC-P01-Pilot-1`. Stop on any failed command or identity mismatch.
The new names below must be unused; keep all previous results.

### 1. Create fresh candidate installation source

In PowerShell at the test root:

```powershell
if (Test-Path RKC-checkpoints) { throw 'Choose an unused candidate folder.' }
git clone --single-branch --branch experiment/create-docs-research-checkpoints-2.14 https://github.com/Vivasergo/Repository-knowledge-compiler.git RKC-checkpoints
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
Set-Location RKC-checkpoints
git rev-parse HEAD
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
npm run pack:local
if ($LASTEXITCODE -ne 0) { throw 'Packaging failed.' }
```

Record the printed candidate commit. Compare it with the handback's commit before
installation. Use Node 24 / npm 11. Deterministic release checks are performed on
the candidate before handback; this owner action builds its local tarball.

### 2. Replace the active experimental installation

First preserve any needed existing `.rkc/temp` notes outside `.rkc`. Explicit
uninstall removes the user-scoped `.rkc` root, including retained notes. Previous
packet docs and archived journals remain outside that installation.

```powershell
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc uninstall --yes
if ($LASTEXITCODE -ne 0) { throw 'Uninstall failed.' }
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc install
if ($LASTEXITCODE -ne 0) { throw 'Install failed.' }
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc version
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc doctor
if ($LASTEXITCODE -ne 0) { throw 'Doctor failed.' }
```

Version must be `2.1.0`. Do not install through npm `latest` or self-update.
Confirm exact candidate bytes, using `.claude` instead of `.agents` if that is
the actual host skill location:

```powershell
$skillRoot = Join-Path $env:USERPROFILE '.agents/skills/rkc-create-docs'
$metadata = Get-Content (Join-Path $skillRoot 'installation.json') -Raw | ConvertFrom-Json
Select-String -Path (Join-Path $skillRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-RESEARCH-CHECKPOINT-PILOT-2'
$reference = 'references/research-checkpoint-experiment.md'
(Get-FileHash (Join-Path $skillRoot $reference) -Algorithm SHA256).Hash -eq (Get-FileHash (Join-Path 'skills/rkc-create-docs' $reference) -Algorithm SHA256).Hash
foreach ($entry in @('research-notes.js', 'research-workspace.js')) {
  $installed = Join-Path $metadata.core_path "node_modules/repository-knowledge-compiler/dist/$entry"
  (Get-FileHash $installed -Algorithm SHA256).Hash -eq (Get-FileHash "packages/bootstrap/dist/$entry" -Algorithm SHA256).Hash
}
(Get-FileHash (Join-Path $metadata.core_path 'documentation/RKC-Documentation-Master-Prompt.md') -Algorithm SHA256).Hash
Set-Location ..
```

Require the marker, three `True` comparisons and the master hash above. A marker
alone is insufficient. Do not continue on mismatch.

### 3. Export the clean P02 packet

```powershell
Set-Location R4-evaluator
python benchmark/chunks-v1/export_packet.py --manifest benchmark/chunks-v1/inputs.json --repo . --case P02 --output ../P02-candidate-r2
if ($LASTEXITCODE -ne 0) { throw 'Packet export failed.' }
Set-Location ../P02-candidate-r2
git init
git add src tests
git commit -m 'test: pin P02 candidate R2 source packet'
if ($LASTEXITCODE -ne 0) { throw 'Packet baseline failed.' }
git status --short
Set-Location ..
```

Status must be empty. Keep `P02-candidate-r2.receipt.json`, located beside the
packet. The exporter refuses existing outputs and verifies frozen blob hashes.
Never open `R4-evaluator` in the generator's IDE workspace.

### 4. Run Create without extra instructions

Open only `P02-candidate-r2` in a fresh agent workspace/session. Invoke:

```text
/rkc-create-docs
```

Approve its normal documentation-only preflight. Nothing else is needed: research
notes, review responses and transfer records are prescribed by the skill.
Record host/model/settings and candidate commit outside the packet. Save the
complete session journal and completion response, including nested reviewer
responses if the host exports them. Do not add hints or launch another run to
repair a disappointing result.

### 5. Return the evidence

Send the complete packet (including original src/tests and generated docs), its
adjacent receipt, full journal/completion response and the exact retained run
folder named by the agent. It should contain `research.md`, `review.md`,
`transfer.md` under `%USERPROFILE%\.rkc\temp\create-docs-<run>`. Copy it before
uninstalling/restoring another RKC version. No miniature-repository push or manual
document corrections are needed. On interruption, send the same available
evidence and identify the last completed phase.

## Decision after P02

Compare to the frozen oracle and existing release R1/candidate R1, without
feeding that oracle to generation. Trace each material discrepancy through
original research, research review/corrections, transfer disposition and final
passage. Distinguish an undiscovered rule, an inaccurate rule and a lost transfer.
Check original reviewer responses against the journal, source immutability,
reader task success, routing and actual available cost measurements. File/word
counts alone do not establish quality.

Require no regression on previously retained mandatory knowledge, no new
material false assertions, and concrete improvement on the known omissions or
misstatements with source-supported final passages. The new stage records must
show the mechanism actually ran; ceremonial PASS labels do not count. If this
fails, stop expansion and diagnose the failed stage, rather than adding more
large runs. One favorable run is preliminary evidence, not a universal guarantee.

If it passes, prepare one clean full-R4 candidate run from the existing pinned
docs-free baseline with the same flow; do not mix in new rules. Compare with
the accepted full-R4 control and inspect scale, cross-area coverage and cost.
Any necessary change to the flow before that run is a new candidate requiring
an explicit explanation. Production main/master remain unchanged pending owner
acceptance. No automated publication or merge.

## Deterministic validation

Run `npm run check:changed -- <all candidate files>` and `npm run release:check`
on the exact candidate. Release checks cover formatting/lint/types/boundaries,
unit tests, secrets/packaging, tarball install, lifecycle and process-kill recovery.
The install test executes the packed research helper: unique runs, retained
notes, deletion of only an owned run, refusal without verified status, refusal of
installed-version paths, in-project storage and unexpected files, unchanged
target bytes and matching instructions/references in both host skill locations.
Results and any platform skip are reported in the handback. Semantic P02 and
full-R4 acceptance remain pending the runs above.
