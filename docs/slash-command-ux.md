# Slash Command and Adapter UX Validation

This document records practical adapter validation for boan-sensei. The goal is to avoid vague "planned" status and keep each tool state tied to a concrete check.

boan-sensei remains a cautious review helper. It collects review candidates and does not confirm exploitability, perform real attacks, or replace direct user review.

## Validation Status

| Tool | Status | What was checked | Result |
| --- | --- | --- | --- |
| Codex adapter (`AGENTS.md`) | 확인 안 됨 (근거: local Codex launch blocked) | `Get-Command codex` found a WindowsApps `codex.exe`, but `codex --help` failed with `Access is denied`. OpenAI Codex public docs checked on 2026-07-07 confirm local Codex CLI and non-interactive `codex exec`/MCP usage, but this local environment could not confirm that the boan-sensei `AGENTS.md` is loaded by Codex. | Keep `adapters/codex/AGENTS.md` as a project-instruction adapter, but mark local execution validation as blocked until Codex CLI can run on this machine. |
| Codex plugin scaffold | 확인 안 됨 (근거: plugin manifest path not locally load-tested) | Repository scaffold exists under `plugins/codex-boan-sensei/`. Local Codex execution was blocked by WindowsApps access, so plugin loading was not tested. | Keep distribution wording cautious and require a separate Codex plugin installation test before claiming support. |
| Cursor rule adapter (`.cursor/rules/*.mdc`) | 실제 동작 확인됨 (근거: official docs + local CLI presence) | `cursor --help` returned Cursor `3.7.27`. Cursor official docs checked on 2026-07-07 describe Rules as persistent instructions, project rules, `.mdc` files, and `AGENTS.md` support in root/subdirectories. | `adapters/cursor/.cursor/rules/boan-sensei.mdc` matches the documented project rule shape. Because `alwaysApply: false` and `globs` is set, it should be treated as a request/context-sensitive rule, not an always-loaded global rule. |
| Cursor plugin-style bundle | 실제 동작 확인됨 (근거: same Cursor rule path) | The plugin bundle packages the same `.cursor/rules/boan-sensei.mdc` file into the target project path used by the adapter. | The bundle path matches the checked Cursor project rule path. It still depends on users having a working local `boan-sensei` command. |
| Unsupported adapter states | 미지원 확인됨: 현재 없음 | No listed adapter was proven unsupported in this batch. | Keep this status vocabulary available for future checks instead of using vague "planned" labels. |

## Official References Checked

- OpenAI Codex CLI README: `https://github.com/openai/codex`
- OpenAI Codex configuration docs: `https://developers.openai.com/codex/config-basic`, `https://developers.openai.com/codex/config-advanced`, `https://developers.openai.com/codex/config-reference`
- Cursor Rules docs: `https://cursor.com/docs/rules`
- Cursor Customize docs: `https://cursor.com/docs/customize-cursor`

## Local Command Evidence

```text
codex --help
=> failed: Access is denied

cursor --help
=> Cursor 3.7.27

cursor agent --help
=> Cursor CLI help printed and lists `agent` as a subcommand
```

## Current Guidance

- Codex: do not claim local adapter execution has been verified on this machine. Use the adapter as project instruction text until a working Codex CLI or app session confirms loading.
- Cursor: the `.mdc` rule is aligned with Cursor's documented project rule mechanism. Keep `alwaysApply: false` so the rule is not presented as globally active in every context.
- All tools: generated findings remain review candidates. Users must inspect and confirm results before acting.
