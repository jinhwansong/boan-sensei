# Cursor Adapter

Cursor에서 `boan-sensei` CLI를 사용할 때 참고할 rule 초안을 담는 폴더입니다.

> English: This directory contains a draft Cursor rule for safe `boan-sensei` CLI usage.

## 포함된 파일

- `.cursor/rules/boan-sensei.mdc`

## 사용 의도

Cursor가 프론트엔드 보안 검토 작업을 도울 때 다음 순서로 CLI를 실행하도록 안내합니다.

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

## 주의

scan 결과는 실제 취약점 확정이 아닙니다. Cursor는 결과를 “점검 후보”, “확인 필요”, “검토 권장”으로 표현해야 하며, 보고서 생성 후 사용자가 직접 확인해야 한다고 안내해야 합니다.

v0.1에서는 Cursor Rule 설치 자동화나 MCP 서버를 구현하지 않습니다.
