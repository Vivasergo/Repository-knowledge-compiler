# R10: маленький Create для проверки очистки

Цель: проверить вызов cleanup клиентским агентом после обычного успешного Create. Это не новый benchmark полноты. R4, принятые docs и установленный RKC не копируются и не переустанавливаются. Full validation R10 уже зелёная.

## 1. Получить точный source fixture

PowerShell, Node 24.12+ <25 и npm 11. Выполнять блоками; на ошибке остановиться. Папки создаются новые, существующие не удаляются.

```powershell
Set-Location 'C:\For RKC tests'
$rkcSmokeId = Get-Date -Format 'yyyyMMdd-HHmmss'
$rkcCandidateDirectory = Join-Path (Get-Location) ('RKC-smoke-source-' + $rkcSmokeId)
$rkcSmokeDirectory = Join-Path (Get-Location) ('RKC-cleanup-smoke-' + $rkcSmokeId)
if ((Test-Path $rkcCandidateDirectory) -or (Test-Path $rkcSmokeDirectory)) { throw 'Output folder already exists.' }
git clone --single-branch --branch release/create-docs-r7-restored-2.1 https://github.com/Vivasergo/Repository-knowledge-compiler.git $rkcCandidateDirectory
if ($LASTEXITCODE -ne 0) { throw 'Clone failed.' }
if ((git -C $rkcCandidateDirectory rev-parse HEAD) -ne '24333c6ded7940fb44dbc901fa3f732c05f4014d') { throw 'Wrong candidate commit.' }
```

Если этот exact checkout уже есть, можно задать его абсолютный путь в `$rkcCandidateDirectory`, проверить SHA и создать только `$rkcSmokeDirectory`. Не делать npm ci/build для подготовки fixture: dependencies здесь не нужны.

## 2. Проверить установленный flow

```powershell
$rkcCreateRoot = Join-Path $env:USERPROFILE '.agents/skills/rkc-create-docs'
$rkcInstallationPath = Join-Path $rkcCreateRoot 'installation.json'
if (-not (Test-Path $rkcInstallationPath)) { throw 'RKC installation metadata missing.' }
$rkcInstallation = Get-Content $rkcInstallationPath -Raw | ConvertFrom-Json
if (-not $rkcInstallation.core_path) { throw 'Installed core path missing.' }
$rkcMaster = Join-Path $rkcInstallation.core_path 'documentation/RKC-Documentation-Master-Prompt.md'
if ((Get-FileHash $rkcMaster -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $rkcCandidateDirectory 'docs/current/RKC-Documentation-Master-Prompt.md') -Algorithm SHA256).Hash) { throw 'Installed master differs.' }
foreach ($rkcSkill in @('rkc-help', 'rkc-create-docs', 'rkc-update-docs', 'rkc-audit-docs')) {
  $rkcInstalledSkill = Join-Path $env:USERPROFILE ".agents/skills/$rkcSkill/SKILL.md"
  $rkcExpectedSkill = Join-Path $rkcCandidateDirectory "skills/$rkcSkill/SKILL.md"
  if ((Get-FileHash $rkcInstalledSkill -Algorithm SHA256).Hash -ne (Get-FileHash $rkcExpectedSkill -Algorithm SHA256).Hash) { throw "Installed skill differs: $rkcSkill" }
}
$rkcReference = 'references/research-checkpoint-experiment.md'
if ((Get-FileHash (Join-Path $rkcCreateRoot $rkcReference) -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $rkcCandidateDirectory "skills/rkc-create-docs/$rkcReference") -Algorithm SHA256).Hash) { throw 'Installed flow differs.' }
if (-not (Select-String -Path (Join-Path $rkcCreateRoot 'SKILL.md') -Pattern 'RKC-CREATE-FLOW-RELEASE-CANDIDATE-10' -Quiet)) { throw 'Wrong flow identity.' }
$rkcClaudeSkill = Join-Path $env:USERPROFILE '.claude/skills/rkc-create-docs/SKILL.md'
if ((Get-FileHash $rkcClaudeSkill -Algorithm SHA256).Hash -ne (Get-FileHash (Join-Path $rkcCreateRoot 'SKILL.md') -Algorithm SHA256).Hash) { throw 'Claude Create skill differs.' }
```

При mismatch остановиться: сначала установить точный кандидат по прежней инструкции без backup, а не применять npm latest. При совпадении не переустанавливать работающий RKC.

## 3. Создать маленький репозиторий

```powershell
New-Item -ItemType Directory -Path $rkcSmokeDirectory | Out-Null
Copy-Item -Path (Join-Path $rkcCandidateDirectory 'fixtures/stage-4/node-api-monorepo/*') -Destination $rkcSmokeDirectory -Recurse
Set-Location $rkcSmokeDirectory
git init
if ($LASTEXITCODE -ne 0) { throw 'git init failed.' }
git add .
if ($LASTEXITCODE -ne 0) { throw 'git add failed.' }
git commit -m 'test: cleanup smoke baseline'
if ($LASTEXITCODE -ne 0) { throw 'baseline commit failed.' }
$rkcSmokeBaseline = git rev-parse HEAD
if (git status --porcelain) { throw 'Smoke repository is not clean.' }
$rkcTempRoot = Join-Path $env:USERPROFILE '.rkc/temp'
$rkcExistingRuns = @(Get-ChildItem -LiteralPath $rkcTempRoot -Directory -Filter 'create-docs-*' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
$rkcExistingNoteHashes = @{}
foreach ($rkcExistingRun in $rkcExistingRuns) {
  foreach ($rkcNoteName in @('research.md', 'review.md', 'transfer.md')) {
    $rkcNotePath = Join-Path $rkcExistingRun $rkcNoteName
    if (Test-Path -LiteralPath $rkcNotePath -PathType Leaf) {
      $rkcExistingNoteHashes[$rkcNotePath] = (Get-FileHash -LiteralPath $rkcNotePath -Algorithm SHA256).Hash
    }
  }
}
Write-Host "Open this repository: $rkcSmokeDirectory"
```

Оставить эту PowerShell-сессию открытой для финальной проверки переменных. Открыть только новую маленькую папку в свежем клиентском agent session. Не добавлять summaries/oracles/R4 docs. Не устанавливать зависимости приложения.

## 4. Запустить Create

Вызвать установленный `/rkc-create-docs` с таким запросом:

> Создай агентскую документацию этого репозитория обычным /rkc-create-docs. После успешного завершения используй стандартную очистку временных research/review/transfer, без retain. Не устанавливай зависимости, не запускай приложение, не делай commit или push. В итоговом сообщении укажи результат очистки и точный путь папки текущего прогона.

Одобрить обычный preflight. Зафиксировать путь из stdout команды `research-notes.js start`; итоговый path сверить с ним. Сохранить журнал с обеими финальными QA и `finish ... delete --verified`. Не запускать finish вручную: иначе проверка реального поведения агента будет подменена проверкой helper.

## 5. Проверить результат в той же PowerShell-сессии

```powershell
$rkcCompletedRun = '<точный абсолютный путь из research-notes.js start>'
if (-not $rkcCompletedRun -or $rkcCompletedRun -like '<*') { throw 'Set the actual run path.' }
if ([System.IO.Path]::GetFileName($rkcCompletedRun) -notmatch '^create-docs-[A-Za-z0-9]+$') { throw 'Wrong run path.' }
if (Test-Path -LiteralPath $rkcCompletedRun) { throw 'Successful run notes remain.' }
foreach ($rkcNotePath in $rkcExistingNoteHashes.Keys) {
  if (-not (Test-Path -LiteralPath $rkcNotePath -PathType Leaf)) { throw "Previous control note removed: $rkcNotePath" }
  if ((Get-FileHash -LiteralPath $rkcNotePath -Algorithm SHA256).Hash -ne $rkcExistingNoteHashes[$rkcNotePath]) { throw "Previous control note changed: $rkcNotePath" }
}
Set-Location $rkcSmokeDirectory
if ((git rev-parse HEAD) -ne $rkcSmokeBaseline) { throw 'Agent changed Git history.' }
foreach ($rkcDoc in @('AGENTS.md', 'docs/ai/README.md')) {
  if (-not (Test-Path $rkcDoc -PathType Leaf)) { throw "Required documentation missing: $rkcDoc" }
}
git diff --exit-code -- packages services package.json
if ($LASTEXITCODE -ne 0) { throw 'Protected tracked source changed.' }
$rkcUnexpectedSource = @(git ls-files --others --exclude-standard -- packages services package.json package-lock.json node_modules .rkc .github)
if ($rkcUnexpectedSource.Count -gt 0) { throw "Unexpected source/dependency files: $($rkcUnexpectedSource -join ', ')" }
git status --short
Write-Host 'PASS: current run removed; old notes and protected sources preserved.'
```

Пустой `.rkc/temp` допустим; старые retained folders тоже. Просмотреть общий git status: ожидаются созданные docs и согласованная README navigation, не неожиданные product files. При ошибке или interruption сохранённые notes нормальны; это не успешный cleanup smoke. Не удалять их вручную до диагностики.

Вернуть журнал запуска, финальное сообщение агента и вывод блока 5. Не нужен новый полный R4, большой архив исходников или повтор Full validation.
