# RKC: история развития и выводы до принятого R10

Срез: 12 октября 2026 года. Это архив знаний для будущего развития, а не новая инструкция генератора и не предложение возобновить эксперименты.

## Текущий статус — читать первым

Владелец принял R10 как релизный кандидат и решил остановить улучшения Create. Основание: восстановление полноты после регрессий R8/R9 и приемлемая структура между R5 и R7. Заморожены master, installed flow, skills и архитектура документации. Разрешены подтверждённые технические исправления релиза; не начинать R11 по инициативе следующего агента.

| Объект                             | Зафиксированное значение                                         |
| ---------------------------------- | ---------------------------------------------------------------- |
| Репозиторий продукта               | `Vivasergo/Repository-knowledge-compiler`                        |
| Последний публичный GitHub release | `v2.0.0`, 24 сентября 2026                                       |
| Принятый кандидат                  | `24333c6ded7940fb44dbc901fa3f732c05f4014d`                       |
| Дерево кандидата                   | `127696bd0e90512fcbb935515bce863f9808685c`                       |
| Рабочая релизная ветка             | `release/create-docs-r7-restored-2.1`                            |
| Package version                    | `2.1.0`, подготовленная версия, не факт npm publication          |
| Master protocol                    | `RKC-DOCS-CREATE-2.14`                                           |
| Flow                               | `RKC-CREATE-FLOW-RELEASE-CANDIDATE-10`                           |
| База full-R4 controls              | `25c556fdd5f28ea42c0cbff86580fca1dc767029` в `Vivasergo/R4-test` |
| Результат R10                      | `b51e031a5c343d1edfc74835e6b843b699cc8526` в R4-test             |

[Full validation точного кандидата](https://github.com/Vivasergo/Repository-knowledge-compiler/actions/runs/38207863977) завершилась успешно: quality, release-candidate, Ubuntu, Windows и macOS. Локальный release check 12 октября также прошёл: 35 passed, 0 failed, один Windows-specific skip на Linux; упаковка, install/lifecycle/process-kill E2E успешны.

Чистый клиентский Create без retain выполнен. Найденный Windows cwd cleanup defect исправлен отдельно, fresh Full validation исправления прошла на трёх ОС. Release metadata подготовлено; 12 октября main fast-forward обновлён до `923dc0eff5273b10d540dfc7c2190dc6bb494fb6`, PR #2 merged. Package и lockfile — 2.1.0; npm publication и tag ещё не выполнены. Архивная ветка не является release branch и не должна сливаться в main.

## Что за продукт мы строим

RKC даёт клиентскому coding agent универсальные skills для создания, обновления и аудита документации репозитория. Собственной модели и отдельного сервиса анализа у RKC нет. Задача: дать агенту с холодным контекстом проверяемые маршруты к знанию, сократить повторное исследование и неподтверждённые предположения.

Принята Markdown-first структура:

- L0: обязательный root `AGENTS.md`, даже при наличии Claude/Gemini/provider-specific instructions.
- L1: router, project context, architecture/state owners, testing, risks/gaps.
- L2: flows и domains, выбираемые по задаче; число и границы адаптируются к проекту.
- Четыре skills: Help, Create, Update, Audit. Init-free lifecycle.
- Create: один owner preflight, исследование, сборка, две финальные QA — accuracy и usefulness — и финальные проверки.
- Runtime пользовательский; зависимости и служебное состояние не добавляются в целевой репозиторий.

Результат не обязан описывать каждый файл. Но должны сохраниться знания, меняющие план будущей работы: owners/writers, value shapes, условия разрешения действий, edit/delete semantics, async windows, последствия отказов, persistence и интеграционные границы.

## Исторические этапы

### A1 → Markdown-first V2

По историческому описанию владельца, A1 строил громоздкие JSON/IR findings и потреблял много контекста без достаточной практической пользы. Этот подход признан неудачным. Не возвращать IR, graph, knowledge manifest, embeddings или RAG без нового наблюдаемого основания и отдельного решения.

V2 строился вокруг проверенной Markdown-документации: entry point, router, flows/domains, state owners, risks и tests. Контроли R3 Blind и R4 подтвердили полезность baseline; 2.0.0 стал публичным стабильным релизом. Эта историческая оценка не является независимым повторным benchmark в текущем архиве.

### Ранние 2.1: staged QA / analysis 2.16 и 2.14

Пробовали усилить исследование и QA стадиями, независимыми проверяльщиками, fidelity/transfer требованиями и большей гранулярностью. Experimental 2.16 не был принят: меньше файлов и потеря важных контрактов. Номер протокола не является доказательством улучшения; владелец выбрал master 2.14 как основу дальнейших экспериментов.

Некоторые ветки этого периода расходятся с поздней принятой линией. Их код и документы сохранены Git ancestry архивного checkpoint, но не интегрированы в принятый runtime. Не считать experiment branch названием однозначного оценённого прогона: проверять commit и run identity.

### Chunk-local cycle и P01/P02

Пробовали локальную последовательность research → review → transfer → doc checks по ограниченным пакетам исходников. Это позволяло увидеть потери transfer без полного большого репозитория. Oracle и ожидаемые ответы находились у evaluator; генератору их не передавали.

P01 дал основания продолжить маленьким P02, но не был доказательством готовности на полном репозитории. В P02 release R1 и candidate R1 сохранили семь обязательных условий, восьмое осталось PARTIAL; формальный gate OPEN. В частности, документация недостаточно точно описывала уровень test evidence и наличие реального локального Y.Doc. Независимая frozen maintenance implementation не была выполнена; static walkthrough нельзя выдавать за её исполнение.

Несколько reviewers не дали гарантированного преимущества перед релизным контролем. Они могли принять одну слишком широкую формулировку. Candidate был компактнее по файлам, но не по словам: release 10 файлов/5 122 слова, candidate 7/5 186. Это укрупнение, а не доказанная экономия контекста.

### Research-checkpoint pilot 2

Согласованный набор улучшений: усилить первоначальное исследование, проверить его независимо, сохранять оригинальные handbacks, проверять semantic transfer, гармонизировать итоговые passages и использовать временные notes вне репозитория. Не добавлять owner approvals на каждый внутренний шаг.

Коммит pilot 2: `018db71830958b643dd8202d0a84778a500102aa`. Master 2.14 сохранился; изменялась installed reference и bounded execution. P02 candidate R2 улучшил error boundaries и отдельные нормализации, но не закрыл PARTIAL test condition; потерял preview contracts и не обеспечил требуемый original-review capture. Масштабирование не разрешалось автоматически по факту заполненных ledgers.

Практический вывод: проверять точные условия и документы на выходе, а не наличие графы coverage/transfer или отметки reviewer «covered».

### Bounded preservation pilot 3 и contract preservation pilot 4

Исследование ограничили максимум пятью назначениями: до трёх research и две финальные QA. Зафиксировали preservation material existing knowledge, evidence/source anchors, transfer с условиями и последствиями, реальные scope limits. Не делать ещё один полный research pass под видом review.

Pilot 4: генератор `f30b9aee490961a03ff578f921efe4a6dafc71fe`, результат R4 `c0d181c2bb5cbcff98e235291e7512a5aa8aa9f0`. Он восстановил существенные metadata conditions и улучшил save/publication/collaboration относительно pilot 3; пять assignments сохранены. Но некоторые знания 2.0 всё ещё пропадали, глобальные правила оставались слишком широкими, внешний сервер описывался чрезмерно уверенно. Направление приняли, окончательную готовность ещё не объявили.

## Последние полные контроли: R5–R10

Счёт одинаковый: `AGENTS.md` + `docs/ai/**/*.md`; root README и существующие skills исключены. Whitespace words — показатель объёма, не измеренные tokens, billed usage или качество.

| Прогон | Канонические файлы | Flows | Domains |  Слова | Оценка                                                       |
| ------ | -----------------: | ----: | ------: | -----: | ------------------------------------------------------------ |
| R5     |                 18 |     3 |       9 | 13 175 | Хороший ориентир достаточной полноты                         |
| R6     |                 14 |     2 |       5 |  8 451 | Регрессия от чрезмерного укрупнения                          |
| R7     |                 30 |     5 |      19 | 17 368 | Восстановление полноты и разделения; местами чрезмерно мелко |
| R8     |                 12 |     2 |       4 | 11 352 | Balance-патч снова сжал знания слишком сильно                |
| R9     |                 16 |     3 |       7 | 11 688 | R5-restored не воспроизвёл качество R5                       |
| R10    |                 24 |     3 |      15 | 14 577 | Принят как RC: основная регрессия устранена                  |

### R5

Генератор `f67aa4a549e9b2deedbdd1b2aae15c8bf5f16bd3`; результат `b07e70f0108e77dd93cb0bdb2923aace523c58d0` в R4-test. Подтвердил полезный объём и task routes. Это ориентир, а не идеальный gold и не шаблон на 18 документов.

### R6: polish с потерей знаний

Оценённый генератор `d95917337cfcdfee21b02938b25e08c6d4182dc0`; результат `b6689c9ffad7be182208893772694259d5d51cee`. Последующий technical Windows fix — `f6c65552d0debff12c641d5102d43937bcf7637c`.

Слишком широкие объединения SDK/plugins, validation/metadata, load/save скрыли разные задачи. Потеряны serializer limitations, schema restrictions, metadata role/delete/default details и маленькие state owners. Объём уменьшился на 35,9% относительно R5. Полезные новые сведения и informative final report/cleanup не отменяли этой регрессии.

Отдельный Windows-сбой был техническим: сравнение helper path с неканионическим TEMP/8.3 alias. Исправление использует realpath parent и basename. Не путать сбой тестового пути с качеством generated docs; этот fix сохранён в последующих кандидатах.

### R7: восстановление разделения

Генератор `18f0a1258ee3a6761fed239067dfe1f7c4718390`; результат `9ca0e5f6229d8c391467030ed5d23a48d0d37ead`. Разделились load, sync, save, publication, workflow, serialization, editor schema/menus, gallery/images/cache, SDK metadata/contentBlocks, plugins/extensions, отдельные metadata capabilities.

Это восстановило полезные контракты, однако больше файлов не гарантировало полной точности. Некоторые passages всё ещё ошибочно называли extra sections неизменяемым snapshot, пропускали persisted user setting и query integration нового block. Значит, сравнивать нужно конкретные conditions/outcomes, а не названия разделов.

Владелец уточнил предпочтение: структура между R5 и R7, без дробления маленьких связанных тем ради самостоятельного файла. Это не разрешение исключать знания ради меньшего объёма.

### R8: balance с повторной регрессией

Генератор `ca3ca0080040dd07e96d88abdad0bdc34bed9358`; результат `7113546495ec5d1a93ab4b20d9817dcb5e737744`. Попытка сбалансировать структуру снова привела к чрезмерному укрупнению и потере material contracts. Результат не принят. Исходный handoff о R8 был написан до результата; его «следующий шаг» теперь устарел.

### R9: откат к R5 не воспроизвёл R5

Генератор `741908a9ce06bc34054d5dedcf95b9cab78d833e`; результат `8d0b159d720f436c779252d0eaa3e4ff92dacb96`. Восстановили смысловые Create-инструкции R5, сохранив runtime fixes и поздний final report. Однако новый run не достиг полноты R5/R7.

Диагностика: при первоначальном исследовании конкретные metadata capabilities исключались как «locally recoverable». Общий writer `useSharedField` принимался за покрытие их контрактов. Затем это проходило QA. Простое разбиение итогового большого файла не вернуло бы невыученные знания.

### R10: R7-restored и один bounded clarification

Генератор `24333c6ded7940fb44dbc901fa3f732c05f4014d`; результат `b51e031a5c343d1edfc74835e6b843b699cc8526`. Вернули смысловые instructions/QA R7. Добавили одно универсальное уточнение: shared writer API/framework не означает покрытия каждой capability; перед covered/excluded сохранять material add/edit/delete, gating, async-completion и persistence conditions/outcomes. Нового этапа или review pass не добавили.

Теперь конкретные metadata capabilities изучены, самостоятельные teaser/related/gallery/workflow/extensions/cache routes восстановились. Общая metadata table сохраняет разные контракты и допустима. SDK contentBlocks внутри SDK-документа не является потерей само по себе. Три flow и пятнадцать domains дали приемлемую середину R5/R7.

QA исправила material ошибки черновика: обязательный load/query путь нового field; dirty-key snapshot против live values после await; пересериализация всех content sections; timeout/init gate; refetch failure после публикации; scope `isSaving`; dotted SDK marker attribution; разные validation registration paths. Не считать генератор безошибочным на первом draft — QA всё ещё необходима.

Остаточные замечания были узкими: категоричное «unmarked никогда не saves», direct-fragment rule без manual plugin mark exception, потеря menu target re-read после await, baseExtensions и nested-list serialization risk; внешний listener API описан слишком уверенно. Владелец решил остановиться на этой версии, не открывая следующий цикл улучшения. Эти замечания сохраняются как future backlog, а не текущий release blocker.

## Чему научили неудачные попытки

1. **Не оптимизировать число файлов.** Меньше файлов может означать потерю task routes; больше файлов не гарантирует coverage. Разделение определяется разными owners/writers, conditions, persistence и integration tasks.
2. **Не считать shared API доказательством изучения capability.** Generic state model не заменяет собственные add/edit/delete/default/failure rules функций продукта.
3. **Не исключать material contracts как «локально очевидные».** Если condition меняет план будущего агента, её нужно узнать и перенести даже из компактного компонента.
4. **Ledger — не знание.** Проверять passages: сохранены ли precedence, exceptions, outcomes, value shape; существуют ли reachable routes. Label/checkbox не доказывают semantic transfer.
5. **Глобальные правила проверять на исключения.** «Всегда», «никогда», «только» часто ломались на nested roots, explicit save overrides, plugin writers и display-only exceptions.
6. **Код и целевые требования — разные оси.** Current code подтверждает actual behavior; owner requirements не отменяются тем, что код пока им противоречит. Риски не являются принятыми design decisions.
7. **QA должна проверять разные задачи.** Два почти одинаковых field-add walkthrough дают меньше информации, чем metadata UI + SDK integration. Это выбор задач внутри двух QA, не предложение добавить третью.
8. **Независимость ограничивать фактами.** Несколько reviewers могут повторить одну ошибку. Reviewer opinion не заменяет writer/consumer/source recheck.
9. **Сохранять точные handbacks.** Original delivered response и полный host transcript — разные артефакты. Пустой transcript не доказывает потери delivered handback; пересказ не является оригиналом.
10. **Разводить уровни проверок.** Link/anchor/hash checks не доказывают semantic coverage; static reasoning не воспроизводит multi-peer runtime; локальный Y.Doc test не равен network collaboration test.
11. **Не вычислять tokens/cost по словам.** Нет полного usage/cache/subagent accounting — оставить стоимость неизвестной. R10 entry AGENTS+router почти равен R7 по словам; экономия стоимости не доказана.
12. **Откат промпта не воспроизводит старый run.** Вариативность модели, host/settings, research scope и передача контекста меняют результат. Проверять exact payload и новый output, не обещать R5 quality по имени ветки.
13. **Менять одну понятную причину за раз.** Не смешивать runtime fixes, wording polish, granularity и исследование так, чтобы невозможно было определить источник регрессии.
14. **Универсальность сохранять.** Source-specific conclusions тестового приложения не входят в master/core/primary fixtures как ожидаемые ответы.
15. **Остановиться после принятия.** Minor possible improvements не оправдывают бесконечное открытие новых кандидатов, особенно после повторных регрессий.

## Очистка notes и эксплуатационные границы

Notes создаются вне target repo в пользовательском `.rkc/temp/create-docs-*`: research, review, transfer. Successful finish по умолчанию удаляет только текущий run; explicit retain оставляет его. Interruption/blocking checks не вызывают successful finish. Пустой `.rkc/temp` допустим.

Helper проверяет ownership/path/markers и не удаляет произвольное дерево рекурсивно. Он не определяет semantic success: `--verified` — утверждение агента. Механизм удаления прошёл install E2E и отдельный installed-tarball контроль, включая сохранение checkpoint и соседнего run. Проверка реального agent invocation без retain остаётся отдельным smoke.

В R10 retention был явно запрошен; сохранённые notes ожидаемы. Владелец не хочет disk backup старой установки при переустановке; не возвращать этот шаг. Репозиторная документация живёт отдельно от user-scoped runtime; uninstall не должен удалять target docs. Старые retained control notes могут удалиться при intentional uninstall, поэтому важные evidence сохранять отдельно до него.

## Как сохранена история веток

На момент аудита 21 ветка и 0 открытых PR. От принятого кандидата создана `archive/development-history-2.1-20261012`. Архивный commit имеет первым parent R10 и дополнительными parents heads расходящихся старых experiment branches. Его дерево содержит прежнее дерево R10 плюс архивные документы.

**Это архивное закрепление истории, не интеграция экспериментальных изменений.** Parent links сохраняют достижимость уникальных commits/trees после удаления refs. Ни один rejected prompt или runtime file не заменяет R10 bytes. Main/release branch не меняются. Не merge/rebase архивную ветку в main; при необходимости переносить только конкретный документ отдельным commit.

Точные heads и решения записаны в [инвентаризации веток](archive-branches-2026-10-12.json). Старые experiment/release refs (17) можно удалить только после проверки, что каждый head достижим из archive и ref не сдвинулся. Архивная ветка должна сохраняться: её удаление уничтожит постоянный reachability anchor уникальных экспериментов.

Оставляются main, активный R10 candidate, архив, а также `docs/clarify-documentation-value-and-maintenance` и `feat/2.1.0-documentation-maintenance`. Последние содержат соответственно два и три уникальных commits относительно кандидата; они не признаны ненужными тестовыми ветками. Решение о них отложено до отдельной проверки цели и необходимости интеграции.

Полные ранние protocols/validation docs восстанавливаются по сохранённым SHA из inventory, например `git show <sha>:docs/development/2.1.0-validation.md`. Утверждение в старом файле «следующий тест» — исторический план, не инструкция новой сессии.

## Правила следующего развития после релиза

Начинать с принятого release/main, нового наблюдаемого дефекта и маленькой воспроизводимой задачи. До patch зафиксировать expected retained contracts, immutable baseline и порядок оценки. Не отправлять generator evaluator answers. Сравнивать whole output по одинаковому знаменателю, route и passage; проверять защиты исходников и фактические host/model/settings. Preserve improvements отдельно от rejected changes.

Release readiness и semantic quality — разные gates. Свежие технические checks уже зелёные. Дальнейшая разработка Create требует нового решения владельца; исторические проблемы этого файла не дают автоматического разрешения менять замороженный flow.

## Дополнение: обычный cleanup smoke 12 октября

Чистый `/rkc-create-docs` на маленьком fixture вызвал cleanup самостоятельно. Agent command запускал finish из той же папки, которую удалял. Windows разрешил unlink всех трёх notes, но вернул EBUSY на rmdir. Повтор снаружи не смог пройти completeness guard, потому что files уже исчезли; агент завершил очистку отдельным rmdir. Это конкретный runtime blocker, который cross-platform E2E прежде не покрывал, поскольку запускал helper из другой cwd.

Владелец лично удалил старые retained notes; их отсутствие не связано с генератором. `.vscode/settings.json` был pre-existing owner file.

Разрешённая техническая доводка: `700fa01d580c6e8f15f4a9984e3ec808ede07d7e`, ветка `fix/research-notes-windows-cwd-2.1`, parent — принятый R10. Изменены только helper, installed-tarball E2E и changelog. Before-delete guard сохраняет весь checkpoint при cwd внутри run и сообщает, как повторить снаружи. Master, skill/reference, protocol/flow и package lockfile не изменены. Локальный release check прошёл; fresh Windows/CI для новых bytes ещё ожидается. Не считать это R11 или новым semantic experiment. Финальный release commit должен включить проверенное runtime исправление.

## Перенос в main 12 октября

После подтверждения владельца выполнен fast-forward main с проверкой expected SHA: `516aebddbf79a775ce9f8156a383a570f04e59c7` → `923dc0eff5273b10d540dfc7c2190dc6bb494fb6`. GitHub PR #2 closed/merged; main tree `fa5245f5ab8aed11742a6b64e4bc65aa907b95c2`. Changed-file preflight прошёл для всех 27 отличающихся от прежнего main файлов. Final release:check прошёл на точном дереве. Предшествующая локальная сборка один раз получила EEXIST при mkdir payload; отдельная rebuild и полный rerun прошли без source change, причина единичного filesystem failure не установлена.

Full validation runtime fix: https://github.com/Vivasergo/Repository-knowledge-compiler/actions/runs/38211937712 — Ubuntu, Windows, macOS, quality и release-candidate успешны. Final release commit изменяет от fix только root changelog; tarball SHA256 остался `00cd45235b42143e36b88b8e5ac438935747afdfcc79f64807409bc043c744d4`. Никакие R10 prompt/skill/flow bytes не изменены при финальной подготовке.

На проверке public npm registry `repository-knowledge-compiler@2.1.0` вернул E404/no matching version. Публикация и v2.1.0 tag ещё не выполнялись; их не считать завершёнными по факту merge. Оставшиеся release/fix refs можно удалять после закрепления release, архивную ветку сохранять.

## Финальные metadata и разрешение на выпуск

12 октября владелец одобрил публикацию 2.1.0, тег и GitHub Release. Повторного запроса разрешения не требуется. Main обновлён до `118f0cfe7685095a5b5e4967e6f3f5eddb1a448f`, tree `65b23b2b2b6d7d2dfd33a00da63f9acac0a385bb`. Изменены только дата/статус CHANGELOG и пояснение npx установки в packages/bootstrap/README.md. Master/skills/flow/runtime остаются принятыми R10 плюс проверенный cwd fix.

Final release:check повторно прошёл: 35 passed, 0 failed, 1 Windows-specific Linux skip; package/install/lifecycle/process-kill E2E успешны. Новый tarball hash `aae025e97c934d8dfc1a238041fc9f4db22c8f34d4856a89e06442b0e5e1247c`; изменение README входит в npm пакет. Registry publication, tag и GitHub Release ещё не выполнены. `npm whoami` в среде агента вернул ENEEDAUTH; создавать tag/release доступный GitHub API не умеет. Владелец получил точные PowerShell-команды с pinned release SHA для публикации из своего npm-аккаунта, tag push, GitHub Release notes и registry install verification. Не просить пароль/токен в чат и не объявлять выпуск состоявшимся до фактической registry проверки.

## npm-публикация подтверждена

12 октября владелец опубликовал repository-knowledge-compiler@2.1.0 из checkout 118f0cfe7685095a5b5e4967e6f3f5eddb1a448f. Сразу после успешного publish npm сообщил processing delay, и немедленный npm view вернул E404. Публикацию не повторяли. Позже независимые prefer-online registry запросы подтвердили version 2.1.0, latest 2.1.0 и dist.shasum 65c6d83baa8b3ae31ab75349e949bce2e7e98d99, совпадающий с журналом владельца.

Проверка непосредственно публичного npm-пакета в изолированном Linux test home прошла: install, version, doctor и uninstall. Установленные master, все четыре skills, flow reference и corrected research-workspace.js побайтно совпали с принятой локальной сборкой. Source sentinel не изменён; изолированный test home удалён. Update status UNKNOWN в doctor означает отсутствие cached update discovery, а не ошибку установки.

На этой проверке v2.1.0 tag и GitHub Release ещё отсутствуют. Владелец должен продолжить с создания тега на 118f0cfe7685095a5b5e4967e6f3f5eddb1a448f и GitHub Release, затем переустановить локальный экспериментальный 2.1.0 через публичный пакет без backup по выданной инструкции. Не повторять npm publish: 2.1.0 уже опубликована.

## Выпуск 2.1.0 завершён

12 октября независимая GitHub-проверка подтвердила опубликованный stable Release https://github.com/Vivasergo/Repository-knowledge-compiler/releases/tag/v2.1.0 (не draft/prerelease). Annotated tag object 8b3d7d1b4d80741d607765cb66a70f6dbbb235c1 указывает на commit 118f0cfe7685095a5b5e4967e6f3f5eddb1a448f. npm latest — 2.1.0. Владелец подтвердил Windows registry reinstall: uninstall экспериментальной установки, install публичного пакета, version 2.1.0 и doctor без ошибок. Update status UNKNOWN — отсутствие cached update check, не installation error. Релизных обязательных шагов больше нет; не инициировать новые Create эксперименты.

Первая Windows npx команда из source checkout RKC завершилась сообщением rkc is not recognized и не запустила uninstall. Проверка из новой внешней папки через npm exec с отдельным cache и bin-links=true прошла. Причина локального workspace resolution вероятна по npm semantics, но отдельно cwd/cache/bin-links не изолировались: не объявлять доказанным npm cache defect. Это ошибка контекста release-install инструкции, не основание менять опубликованный runtime. Инструкция владельца обновлена без повторной публикации.
