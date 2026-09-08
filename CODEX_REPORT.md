# CODEX_REPORT

## Задача

Настроить независимый внешний HTTPS Preview для PR #2 и будущих PR без изменения production GitHub Pages, UI или функциональности дашборда.

## Что реализовано

- Добавлен `.github/workflows/pr-preview.yml`, запускаемый при открытии PR и каждом новом push.
- Workflow выполняет install, lint, typecheck и build, затем публикует PR в отдельный бесплатный GitHub Pages repository.
- Каждый PR получает стабильный каталог `pr-<number>`; результат и SHA записываются в Job Summary и обновляемый комментарий PR.
- Production `.github/workflows/deploy-pages.yml` не изменялся и по-прежнему связан только с `main` и environment `github-pages`.
- UI, данные и учебная логика не изменялись.

## Изменённые файлы

- `.github/workflows/pr-preview.yml`
- `docs/PREVIEW_SETUP.md`
- `package.json`
- `CODEX_REPORT.md`

## Commit SHA

Preview-инфраструктура: `bbec5bb3e0a63d408eaf27155c1c4fad48493bf7`.

## Pull Request

PR #2: https://github.com/mejikbiksmann-svg/iosif-math-teacher/pull/2  
Ветка: `codex-m774k0`.

## Проверки

- `npm run lint` — успешно.
- `npm run typecheck` — успешно.
- `npm run build` — успешно.
- YAML workflow parse — успешно.
- `git diff --check` — успешно.

## Preview

Целевой URL после однократной настройки:

https://mejikbiksmann-svg.github.io/iosif-math-teacher-previews/pr-2/dashboard/

**Preview сейчас ещё не существует.** GitHub не поддерживает второй независимый Pages deployment в одном repository. Владелец должен один раз создать публичный repository `mejikbiksmann-svg/iosif-math-teacher-previews`, добавить write-enabled deploy key как secret `PR_PREVIEW_DEPLOY_KEY`, а после первого запуска включить Pages для ветки `gh-pages`. Точные минимальные шаги находятся в `docs/PREVIEW_SETUP.md`.

## Нерешённые проблемы

- Однократная настройка отдельного preview repository ещё не выполнена.
- В проекте нет отдельного набора автоматизированных unit/integration tests.
