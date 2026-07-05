---
name: boan-sensei
description: Use boan-sensei to collect frontend security review candidates and generate Markdown reports with a local CLI.
---

# boan-sensei

Use this skill when working in a frontend project and the user wants help collecting security review candidates, preparing an internal security review report, or turning review candidates into developer TODO items.

boan-sensei does not confirm security impact and does not perform penetration testing. Treat every result as a review candidate that needs human confirmation.

## When To Use

- The user asks for a frontend security review pass.
- The user wants a Markdown security report for internal sharing.
- The user wants a developer checklist for follow-up review work.
- The project is a JavaScript, TypeScript, React, Vue, Next.js, Vite, or similar frontend codebase.

## Workflow

Run the commands from the project root:

```bash
npx boan-sensei scan --mode basic
npx boan-sensei report --mode basic
npx boan-sensei todo
```

Supported modes:

- `basic`: default review candidate report
- `blue`: defensive review and operational checks
- `red`: simulation questions from an attacker-minded review perspective
- `purple`: paired Red questions and Blue actions

## Language Rules

Never describe a result as confirmed security impact unless the user has provided separate verified evidence.

Use cautious language such as:

- 점검 후보
- 확인 필요
- 검토 권장
- 사용 위치 발견
- 운영 반영 전 확인 필요
- 공격자 관점 검토 질문

Avoid definitive or promotional security claims.

## User Confirmation

After generating the report, tell the user that they must review the findings directly. The generated Markdown is an auxiliary review document and does not replace penetration testing, security certification, or professional security assessment.

보고서 생성 후에는 사용자가 직접 확인해야 한다고 안내한다.

Do not create or assume an MCP server for boan-sensei.
