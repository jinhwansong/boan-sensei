# boan-sensei Adapter Guidance

Use boan-sensei when the user asks for frontend security review support, an internal Markdown report, or developer TODO items.

boan-sensei is an adapter-first workflow. The CLI is a local execution engine. Do not assume npm publishing is required.

## Before Running

Confirm that the `boan-sensei` command is available in the target project workflow. During local development, build the repository first:

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

As an adapter-friendly single entry point, `boan-sensei review --mode basic` may be used to run the same scan, report, and TODO sequence. Keep the three-step flow above available for conservative tool workflows that prefer explicit commands.

For specialized reports, use `--mode blue`, `--mode red`, or `--mode purple`.

For deeper domain-specific review, consult the top-level `skills/<name>/SKILL.md` drafts such as `skills/xss-review/SKILL.md` or `skills/token-auth-review/SKILL.md`. These drafts are guidance only and are not wired to a `--skill` CLI option.

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

Generated files:

- `.boan-sensei/findings.json`
- `SECURITY_REPORT.md`
- `SECURITY_BLUE_TEAM.md`
- `SECURITY_RED_TEAM_SIMULATION.md`
- `SECURITY_PURPLE_TEAM.md`
- `SECURITY_TODO.md`

## Required Language

Do not describe boan-sensei output as confirmed security impact.

Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. It only summarizes review questions from an attacker's perspective based on local code signals.

Use cautious language:

- Review candidate
- Needs review
- Recommended check
- Code signal detected
- 점검 후보
- 확인 필요
- 검토 권장
- 코드 신호 발견

## User Confirmation

After generating the report, tell the user that they must review the findings directly. The generated report is auxiliary material for frontend security review and needs human confirmation.

Do not build or assume an MCP server for boan-sensei in this adapter.
