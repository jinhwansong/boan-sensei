# boan-sensei Adapter Guidance

Use boan-sensei when the user asks for frontend security review support, a Markdown report for internal sharing, or a developer TODO checklist for follow-up review.

boan-sensei is a local CLI helper. It collects frontend security review candidates only. It does not confirm vulnerabilities, perform penetration testing, provide security certification, or replace professional security assessment.

## Command Order

Run these commands from the target project root:

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

Generated files:

- `.boan-sensei/findings.json`
- `SECURITY_REPORT.md`
- `SECURITY_TODO.md`

## Required Language

Do not describe boan-sensei output as confirmed vulnerabilities.

Use cautious language:

- 점검 후보
- 확인 필요
- 검토 권장

Avoid definitive language:

- 취약점 발견
- 보안 취약점 확정
- 침투 테스트 결과

## User Confirmation

After generating the report, tell the user that they must review the findings directly. The generated report is an auxiliary document for frontend security review and needs human confirmation.

보고서 생성 후에는 사용자가 직접 확인해야 한다고 안내한다.

Do not build or assume an MCP server for boan-sensei in this adapter.
