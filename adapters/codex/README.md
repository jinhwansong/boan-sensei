# Codex Adapter

Codex에서 `boan-sensei` CLI를 사용할 때 참고할 `AGENTS.md` 초안을 담는 폴더입니다.

> English: This directory contains draft Codex agent instructions for safe `boan-sensei` CLI usage.

## 포함된 파일

- `AGENTS.md`

## 사용 의도

Codex가 프론트엔드 프로젝트에서 보안 점검 후보 수집과 Markdown 보고서 생성을 도울 때 다음 흐름을 안내합니다.

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

## 주의

Codex는 결과를 실제 취약점으로 단정하지 않아야 합니다. “점검 후보”, “확인 필요”, “검토 권장” 표현을 사용하고, 보고서 생성 후 사용자가 직접 확인해야 한다고 안내해야 합니다.

v0.1에서는 Codex Plugin이나 MCP 서버를 구현하지 않습니다.
