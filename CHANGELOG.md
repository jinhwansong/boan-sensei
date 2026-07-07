# CHANGELOG

## Batch 5-C - Feedback Loop and External Smoke Testing

- Added `scripts/smoke-test-external.sh` and `scripts/smoke-test-external.ps1` so maintainers can point boan-sensei at another project and confirm the scan completes without judging the findings.
- Added false-positive feedback guidance to reports, TODO output, and PR comment output so users can report category and location details through GitHub Issues.
- Added this changelog to describe improvements by user-visible batches instead of only commit-level changes.

## Batch 5-B - Adapter Validation Evidence

- Added `docs/slash-command-ux.md` with explicit validation states: `실제 동작 확인됨`, `확인 안 됨 (근거: ...)`, and `미지원 확인됨`.
- Verified Cursor CLI presence locally as `Cursor 3.7.27` and checked official Cursor docs for `.mdc` project rules and `AGENTS.md` support.
- Attempted local Codex CLI validation; `codex.exe` was present through WindowsApps, but `codex --help` failed with `Access is denied`, so Codex loading remains documented as not locally verified.

## Batch 5-A - Cross-Signal Review Priority

- Added file-level correlation so related code signals in the same file can raise review priority without adding new Finding fields.
- Added report ordering and a `우선 검토 권장 (상위 N건)` section so high and higher-confidence candidates appear first.
- Added `--top <n>` for report/review output to control how many priority items are highlighted.

## Batches 1-4 - Scanner Signal Quality and Adapter Identity

- Reduced public env noise by lowering URL-like public env names such as `VITE_BASE_URL` to low-confidence while keeping names with `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `CREDENTIAL`, or `PRIVATE` at medium review priority.
- Expanded console output checks to `console.debug`, `console.info`, `console.warn`, and `console.error`, while lowering logs without obvious sensitive identifiers.
- Improved storage, `target="_blank"`, `dangerouslySetInnerHTML`, embed/object, postMessage, and secret-pattern handling with cautious review-candidate wording.
- Clarified adapter-first identity, plugin bundle structure, skills vs adapters/plugins, and reviewed-state/slash-command workflow without changing the core safety tone.
