---
name: boan-sensei
description: Use boan-sensei to collect frontend security review candidates and generate Markdown reports with a local CLI.
---

# boan-sensei

Use this skill when working in a frontend project and the user wants help collecting security review candidates, preparing an internal security review report, or turning review candidates into developer TODO items.

boan-sensei does not confirm vulnerabilities and does not perform penetration testing. Treat every result as a review candidate that needs human confirmation.

## When To Use

- The user asks for a frontend security review pass.
- The user wants a Markdown security report for internal sharing.
- The user wants a developer checklist for follow-up review work.
- The project is a JavaScript, TypeScript, React, Vue, Next.js, Vite, or similar frontend codebase.

Do not use boan-sensei as proof that a project is secure or insecure.

## Workflow

Run the commands from the project root:

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

Expected outputs:

- `.boan-sensei/findings.json`
- `SECURITY_REPORT.md`
- `SECURITY_TODO.md`

## Language Rules

Never describe a result as a confirmed vulnerability unless the user has provided separate verified evidence.

Use cautious language such as:

- 점검 후보
- 확인 필요
- 검토 권장

Avoid definitive language such as:

- 취약점 발견
- 보안 취약점 확정
- 침투 테스트 결과

## User Confirmation

After generating the report, tell the user that they must review the findings directly. The generated Markdown is an auxiliary review document and does not replace penetration testing, security certification, or professional security assessment.

보고서 생성 후에는 사용자가 직접 확인해야 한다고 안내한다.

Do not create or assume an MCP server for boan-sensei.
