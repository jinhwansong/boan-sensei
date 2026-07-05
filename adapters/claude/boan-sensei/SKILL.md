---
name: boan-sensei
description: Use boan-sensei to collect frontend security review candidates and generate Markdown reports with a local CLI.
---

# boan-sensei

Use this skill when working in a frontend project and the user wants security review support, an internal Markdown report, or developer TODO items.

boan-sensei is an adapter-first workflow. The CLI is a local execution engine. Do not assume npm publishing is required.

## Before Running

Confirm that the `boan-sensei` command is available in the target project workflow. During local development, the repository should be built first:

```bash
pnpm install
pnpm build
```

If the command is not available, ask the user how they want to expose the local CLI before continuing.

## Command Order

Run from the target project root:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

Mode examples:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic

boan-sensei scan --mode blue
boan-sensei report --mode blue

boan-sensei scan --mode red
boan-sensei report --mode red

boan-sensei scan --mode purple
boan-sensei report --mode purple
```

## Modes

- `basic`: default review candidate report
- `blue`: defensive review and operational checks
- `red`: Red Team Simulation questions from an attacker-minded review perspective
- `purple`: paired Red questions and Blue actions

Red mode does not perform real attacks, exploitation, bypassing, or penetration testing.

## Language Rules

Use cautious language:

- Review candidate
- Needs review
- Recommended check
- Code signal detected
- 점검 후보
- 확인 필요
- 검토 권장
- 코드 신호 발견

Avoid definitive or promotional security claims.

## User Confirmation

After generating a report, tell the user that they must review the findings directly. The generated Markdown is an auxiliary review document and does not replace professional security assessment.

Do not create or assume an MCP server for boan-sensei.
