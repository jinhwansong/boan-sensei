---
name: boan-sensei
description: Use boan-sensei to collect frontend security review candidates and generate local Markdown reports from Codex.
---

# boan-sensei

Use this skill when the user asks Codex for frontend security review support, internal Markdown reports, or developer TODO items.

boan-sensei is an adapter-first workflow. The CLI is the local execution engine. This plugin scaffold does not add an MCP server and does not assume npm publishing is required.

## Before Running

Confirm that the `boan-sensei` command is available in the target project workflow.

During local development of the boan-sensei repository, build first:

```bash
pnpm install
pnpm build
```

If the command is not available, ask the user how they want to expose the local CLI before continuing.

For deeper domain-specific review, consult the top-level `skills/<name>/SKILL.md` drafts such as `skills/xss-review/SKILL.md` or `skills/token-auth-review/SKILL.md`. These drafts are guidance only and are not wired to a `--skill` CLI option.

## Command Order

Run from the target project root:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

As an adapter-friendly single entry point, `boan-sensei review --mode basic` may be used to run the same scan, report, and TODO sequence. Keep the three-step flow above available for conservative tool workflows that prefer explicit commands.

Mode-specific report flows:

```bash
boan-sensei scan --mode blue
boan-sensei report --mode blue

boan-sensei scan --mode red
boan-sensei report --mode red

boan-sensei scan --mode purple
boan-sensei report --mode purple
```

## Safety Rules

Do not present output as confirmed security impact.

Use cautious language:

- Review candidate
- Needs review
- Recommended check
- Code signal detected
- 점검 후보
- 확인 필요
- 검토 권장
- 코드 신호 발견

Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. It only summarizes review questions from an attacker's perspective based on local code signals.

After generating reports, tell the user that they must review the findings directly.

Do not create or assume an MCP server for boan-sensei.
