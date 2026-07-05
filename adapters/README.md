# adapters

이 폴더는 AI 코딩툴에서 `boan-sensei` CLI를 더 쉽게 사용하도록 돕는 안내 파일을 모아두는 곳입니다.

v0.1에서는 실제 MCP 서버, 플러그인, 배포 가능한 통합 패키지를 만들지 않습니다. 대신 Claude Code, Cursor, Codex가 `npx boan-sensei scan`, `report`, `todo` 순서로 CLI를 호출할 때 지켜야 할 사용 원칙을 문서로 제공합니다.

> English: This directory contains draft guidance for using the `boan-sensei` CLI from AI coding tools. v0.1 does not implement MCP servers or full plugin integrations.

## 제공 파일

- `claude/boan-sensei/SKILL.md`: Claude Code용 Skill 초안
- `cursor/.cursor/rules/boan-sensei.mdc`: Cursor Rule 초안
- `codex/AGENTS.md`: Codex 작업 지침 초안

## 공통 원칙

- 결과를 실제 취약점으로 단정하지 않습니다.
- “점검 후보”, “확인 필요”, “검토 권장” 표현을 사용합니다.
- CLI 출력은 짧게 유지하고, 자세한 내용은 JSON/Markdown 결과물에서 확인합니다.
- 보고서 생성 후에는 사용자가 직접 검토해야 한다고 안내합니다.

## 아직 하지 않는 것

- MCP 서버 구현
- Claude Skill 배포 자동화
- Cursor Rule 설치 자동화
- Codex Plugin 구현
