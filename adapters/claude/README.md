# Claude Adapter

Claude Code에서 `boan-sensei`를 사용할 때 참고할 Skill 초안을 담는 폴더입니다.

> English: This directory contains a draft Claude Code Skill for guiding safe `boan-sensei` CLI usage.

## 포함된 파일

- `boan-sensei/SKILL.md`

## 사용 의도

Claude Code가 프론트엔드 프로젝트에서 보안 점검 후보를 수집해야 할 때 다음 흐름을 안내합니다.

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

## 주의

이 adapter는 실제 취약점 판정 도구가 아닙니다. 결과는 “점검 후보”, “확인 필요”, “검토 권장”으로 표현해야 합니다.

v0.1에서는 Claude Skill 배포 자동화나 MCP 서버를 구현하지 않습니다.
