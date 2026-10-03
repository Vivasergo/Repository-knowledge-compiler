# Chunk pilot 1: candidate and P01 run instructions

Status: unpublished installable candidate; semantic acceptance pending owner runs.

## Candidate identity and boundaries

- Branch: `experiment/create-docs-chunk-cycle-2.14`.
- Base: approved plan tree from `experiment/chunk-pilot-plan-2.14`; production
  ancestry remains `516aebddbf79a775ce9f8156a383a570f04e59c7`.
- Local distribution version: `2.1.0`, not published to npm.
- Flow identity: `RKC-CREATE-FLOW-CHUNK-PILOT-1`.
- Reference: `skills/rkc-create-docs/references/chunk-cycle-experiment.md`.
- Master: `RKC-DOCS-CREATE-2.14`, unchanged SHA256
  `781eb552765706b35d28ce7f445510baf3b3280aff15a0aebb42915e9ab8c948`.

This candidate wires the local cycle into Create. It does not copy entire EXP3,
4B or 5A flow. Other skills, installer/runtime behavior and production stay
unchanged. The bootstrap package, version constant, matching identity test and
lock entry use 2.1.0 so the local distribution is distinguishable from production;
update-discovery test fixtures use newer mock versions to preserve their meaning.
identity/reference bytes must
also be checked because earlier unpublished experiments use that same version.

Candidate controls: at most two behavior units, sequential primary research/draft,
one local correction cycle per unit, at most five sequential read-only delegated
assignments (up to two local checks, one material seam check, two final QA).
These are explicitly pilot controls, not a whole-repository scaling policy.
Control retains production flow and its own assignment rules. Differences in
review allocation are part of the tested process; this is not an equal-agent-count
ablation. No external expected topics or benchmark answers enter the candidate.

Normal invocation is sufficient. Diagnostic originals, pre-review passages,
complete reviews and dispositions are retained by the candidate outside the target.
The preflight follows bounded orientation before full local research and writing;
no files are written before the single ordinary approval.

## P01 controls before starting

Use the same host/model/settings and permissions for both runs, fresh sessions,
the same seven-file source packet, and a single ordinary preflight approval.
No previous docs, evaluation notes or expected answers in either session.
Both source packets are statically readable subsets, not runnable applications.
No product execution or dependency installation is authorized in the packets.

One Create invocation per method. Do not ask for another sweep, add instructions
or continue an unsuccessful run with new hints. Candidate allows one correction
cycle as defined above. If its rules are ignored, record the result rather than
repairing the evaluation by coaching. Use existing logs/host metrics for actual
token/time measurements if available; missing measurements remain unknown.
Do not impose a fabricated token quota which the host cannot enforce.

Hard assignment/unit/correction bounds are the candidate's initial resource
control. There is no automated wall-time/token limit in the installer. Stop a
clearly stalled run and preserve its trace; report interruption honestly rather
than treating it as a finished semantic result. No automatic repeated runs.

## 1. Create an isolated test folder

Run in PowerShell from a location where a new test folder should live. The name
must be unused; preserve all existing work. This creates separate clones so no
existing RKC/R4 working branch is switched or cleaned.

```powershell
if (Test-Path RKC-P01-Pilot-1) { throw "Choose a new test folder name." }
New-Item -ItemType Directory RKC-P01-Pilot-1
Set-Location RKC-P01-Pilot-1
git clone --single-branch --branch benchmark/chunks-reference-v1 https://github.com/Vivasergo/R4-test.git R4-evaluator
git clone --single-branch --branch main https://github.com/Vivasergo/Repository-knowledge-compiler.git RKC-release
git clone --single-branch --branch experiment/create-docs-chunk-cycle-2.14 https://github.com/Vivasergo/Repository-knowledge-compiler.git RKC-candidate
```

Stop if a command fails; do not continue installation from an unverified clone.
The evaluator contains hidden answers. Never open it in the generator's IDE
workspace. It stays outside both packet roots.

## 2. Export two identical P01 inputs

```powershell
Set-Location R4-evaluator
python benchmark/chunks-v1/export_packet.py --manifest benchmark/chunks-v1/inputs.json --repo . --case P01 --output ../P01-release-r1
python benchmark/chunks-v1/export_packet.py --manifest benchmark/chunks-v1/inputs.json --repo . --case P01 --output ../P01-candidate-r1
Set-Location ../P01-release-r1
git init
git add src tests
git commit -m "test: pin P01 source packet"
git status --short
Set-Location ../P01-candidate-r1
git init
git add src tests
git commit -m "test: pin P01 source packet"
git status --short
Set-Location ..
```

Both status outputs must be empty. Use `python3` instead of `python` only if that
is the installed Python 3 command. Keep both adjacent `.receipt.json` files; they
record the R4 origin, exact blobs and byte counts. The new packet Git commits are
local evidence baselines, not the original full-R4 commit: do not pretend otherwise.
Exported source content is identical even if local commit metadata differs.

## 3. Install and run the release control

```powershell
Set-Location RKC-release
git switch --detach 516aebddbf79a775ce9f8156a383a570f04e59c7
npm ci
npm run pack:local
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.0.0.tgz rkc uninstall --yes
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.0.0.tgz rkc install
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.0.0.tgz rkc version
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.0.0.tgz rkc doctor
```

Version must be `2.0.0`. Explicit reinstall replaces an earlier active experimental
installation. It changes only user-scoped RKC, not repository source or docs.
Close the previous agent session; open only `P01-release-r1` in a new IDE window
and use a fresh session. Invoke only:

```text
/rkc-create-docs
```

Approve the normal documentation-only preflight. Do not add examples or requests
for notes. Save the full journal and completion response outside the packet.
Preserve the packet result before switching the installation.

## 4. Install and run the candidate

In a terminal at `RKC-candidate` (not in the packet):

```powershell
git rev-parse HEAD
npm ci
npm run release:check
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc uninstall --yes
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc install
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc version
npx --yes --package ./artifacts/local-package/repository-knowledge-compiler-2.1.0.tgz rkc doctor
```

Version must be `2.1.0`; record the commit printed by the first command. Never
activate this candidate through `latest` or self-update. Confirm installed bytes:

```powershell
$createSkillPath = Join-Path $env:USERPROFILE '.agents/skills/rkc-create-docs'
$createMetadata = Get-Content (Join-Path $createSkillPath 'installation.json') -Raw | ConvertFrom-Json
Select-String -Path (Join-Path $createSkillPath 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-CHUNK-PILOT-1'
$installedReference = Join-Path $createSkillPath 'references/chunk-cycle-experiment.md'
(Get-FileHash $installedReference -Algorithm SHA256).Hash -eq (Get-FileHash 'skills/rkc-create-docs/references/chunk-cycle-experiment.md' -Algorithm SHA256).Hash
$installedMaster = Join-Path $createMetadata.core_path 'documentation/RKC-Documentation-Master-Prompt.md'
(Get-FileHash $installedMaster -Algorithm SHA256).Hash
```

The marker must be found, the reference comparison must print `True`, and the
master hash must match the identity above (case-insensitive). Stop on mismatch.
Open only `P01-candidate-r1`, start a fresh session, invoke only `/rkc-create-docs`
and approve its normal preflight. The skill itself requests and retains notes.

## 5. What to return

Preserve both packet folders after the runs, both receipts, full session journals,
completion responses and the candidate's diagnostic folder named in its final
response. A ZIP of these results is sufficient; do not mix the evaluator/oracle
into it. Preserve src/tests too so changes can be detected. No need to manually
correct documents or push either miniature repository before analysis.

Record the host/model, candidate source commit and actual measurements available.
If a run was interrupted or checks were unavailable, include that fact.
The control's missing stage notes are UNOBSERVABLE, not invented findings.

The evaluator will compare discovery, corrected findings and actual final passages,
check new false assertions and the maintenance task, and trace the failed stage.
Any mechanism revision gets a new clean candidate packet/session. Do not reuse
the previous candidate's generated docs. Initial control can remain fixed during
iteration when its input/process is unchanged; confirmation requires a repeat.

After evaluation, restore production using the release installation commands
if desired. Do not run P02/P03 or full R4 until the P01 comparison is assessed.

## Validation record

`npm ci`, changed-file preflight and `npm run release:check` passed against the
candidate, including tarball install/lifecycle/process-kill checks. Unit tests:
35 passed, one platform-specific test skipped on Linux, zero failed. The
install test compares actual installed Create/reference bytes for both host
locations with candidate source. These deterministic checks establish packaging
and lifecycle behavior, not semantic success of the new flow. Owner P01 runs
are the planned forward test; they have not yet occurred.
