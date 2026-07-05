[English](./README.md) | [한국어](./README.ko.md)

# boan-sensei

## 프로젝트 소개

`boan-sensei`는 프론트엔드 프로젝트를 위한 무료 오픈소스 Node.js CLI입니다. 로컬 소스 코드에서 보안 점검 후보를 수집하고, 개발자 검토와 내부 공유에 사용할 Markdown 보고서를 생성합니다.

CLI 출력은 짧게 유지하고, 자세한 내용은 생성 파일에 남깁니다. 결과는 최종 판단이 아니라 사람이 확인해야 할 점검 후보로 다룹니다.

## boan-sensei가 하는 일

- `src` 하위 프론트엔드 파일을 검사합니다.
- 브라우저 저장소, 공개 환경 변수, iframe, cross-window messaging, 디버그 출력 등 코드 신호를 수집합니다.
- `.boan-sensei/findings.json`에 구조화된 결과를 저장합니다.
- 모드별 Markdown 보고서를 생성합니다.
- 개발자용 TODO 체크리스트를 생성합니다.
- scan 완료 후 짧은 “보안선생 한마디”를 출력합니다.

## boan-sensei가 하지 않는 일

- 보안 영향을 확정하지 않습니다.
- 침투 테스트를 수행하지 않습니다.
- 외부 URL을 스캔하지 않습니다.
- 실제 취약 여부 데이터베이스와 연동하지 않습니다.
- `npm audit`을 실행하지 않습니다.
- 소스 코드를 자동 수정하지 않습니다.

생성된 결과는 최종 판단이 아니라 검토를 돕는 보조 자료로 사용해야 합니다.

## 설치

패키지 배포 후에는 `npx`로 실행할 수 있습니다.

```bash
npx boan-sensei scan
```

현재 저장소에서 개발용으로 실행하려면:

```bash
pnpm install
pnpm build
pnpm --filter boan-sensei exec boan-sensei scan
```

## 사용법

기본 흐름:

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

모드별 보고서 생성:

```bash
npx boan-sensei scan --mode blue
npx boan-sensei report --mode blue

npx boan-sensei scan --mode red
npx boan-sensei report --mode red

npx boan-sensei scan --mode purple
npx boan-sensei report --mode purple
```

## 명령어

### `boan-sensei scan [--mode basic|blue|red|purple]`

현재 작업 디렉터리를 기준으로 검사하고 `.boan-sensei/findings.json`을 생성합니다.

검사 대상 확장자:

- `.js`
- `.jsx`
- `.ts`
- `.tsx`
- `.vue`

제외 경로:

- `node_modules`
- `dist`
- `build`
- `.next`
- `.git`
- `coverage`

### `boan-sensei report [--mode basic|blue|red|purple]`

`.boan-sensei/findings.json`을 읽고 선택한 모드에 맞는 Markdown 보고서를 생성합니다.

### `boan-sensei todo`

`.boan-sensei/findings.json`을 읽고 `SECURITY_TODO.md`를 생성합니다.

## 모드

| 모드 | 설명 | 생성 파일 |
| --- | --- | --- |
| `basic` | 기본 프론트엔드 보안 점검 후보 보고서 | `SECURITY_REPORT.md` |
| `blue` | 방어자 관점 보고서 | `SECURITY_BLUE_TEAM.md` |
| `red` | Red Team Simulation 보고서 | `SECURITY_RED_TEAM_SIMULATION.md` |
| `purple` | Red 관점과 Blue 조치를 함께 정리하는 보고서 | `SECURITY_PURPLE_TEAM.md` |

red mode는 실제 공격, 익스플로잇, 우회, 침투 테스트를 수행하지 않습니다. 로컬 코드 신호를 바탕으로 공격자 관점의 검토 질문만 정리합니다.

## 생성 파일

- `.boan-sensei/findings.json`
- `SECURITY_REPORT.md`
- `SECURITY_TODO.md`
- `SECURITY_BLUE_TEAM.md`
- `SECURITY_RED_TEAM_SIMULATION.md`
- `SECURITY_PURPLE_TEAM.md`

## 안전 안내

`boan-sensei`가 생성하는 보고서는 프론트엔드 보안 점검 후보를 정리하는 보조 자료입니다. 침투 테스트, 보안 인증, 전문 보안 진단을 대체하지 않습니다.

권장 표현:

- 점검 후보
- 확인 필요
- 검토 권장
- 코드 신호 발견

## AI 코딩툴 어댑터

AI 코딩툴에서 `boan-sensei`를 사용할 수 있도록 초안 문서를 제공합니다.

- `adapters/claude/boan-sensei/SKILL.md`
- `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- `adapters/codex/AGENTS.md`

이 문서들은 언제 `boan-sensei`를 실행할지, mode를 어떻게 사용할지, 결과를 어떤 표현으로 안내할지를 설명합니다. MCP 서버, 자동 수정, 완성된 플러그인 통합은 현재 범위에 포함하지 않습니다.

## 개발

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

프로젝트 구조:

```text
packages/core      스캔, 보고서 생성, mode 템플릿
apps/cli           Node.js CLI 엔트리포인트
adapters           AI 코딩툴 사용 안내
templates          향후 템플릿 예시
docs               프로젝트 메모와 설계 문서
```

## 라이선스

이 프로젝트는 무료 오픈소스 소프트웨어로 공개하는 것을 목표로 합니다. 안정 버전 배포 전에 저장소 라이선스 파일을 추가해야 합니다.
