[English](./README.md) | [한국어](./README.ko.md)

# boan-sensei

## 프로젝트 소개

`boan-sensei`는 Codex, Cursor, Claude Code 같은 AI 코딩툴에 붙여 쓰는 adapter-first 프론트엔드 보안 점검 워크플로우 팩입니다.

`apps/cli`의 CLI는 adapter가 호출하는 로컬 실행 엔진입니다. 이 프로젝트의 핵심 방향은 npm에서 전역 CLI를 먼저 설치하는 것이 아니라, 각 AI 코딩툴에 맞는 adapter를 넣고 로컬 점검 흐름을 조심스럽게 실행하도록 만드는 것입니다.

## boan-sensei가 하는 일

- AI 코딩툴에 반복 가능한 프론트엔드 보안 점검 흐름을 제공합니다.
- `src` 아래의 프론트엔드 파일을 검사합니다.
- 브라우저 저장소, 공개 환경 변수, iframe, cross-window messaging, 디버그 출력 같은 키워드 기반 코드 신호를 수집합니다.
- `.boan-sensei/findings.json`에 구조화된 결과를 저장합니다.
- mode별 Markdown 보고서를 생성합니다.
- 개발자용 TODO 체크리스트를 생성합니다.
- AI 코딩툴 컨텍스트가 과하게 길어지지 않도록 CLI 출력은 짧게 유지합니다.

## boan-sensei가 하지 않는 일

- 보안 영향을 확정하지 않습니다.
- 침투 테스트를 수행하지 않습니다.
- 외부 URL을 스캔하지 않습니다.
- 외부 보안 데이터베이스와 연동하지 않습니다.
- `npm audit`을 실행하지 않습니다.
- 소스 코드를 자동 수정하지 않습니다.

생성된 결과는 최종 판단이 아니라 검토를 돕는 보조 자료로 사용해야 합니다.

## Adapter-First 설정

사용 중인 AI 코딩툴에 맞는 adapter를 사용합니다.

- Claude Code: `adapters/claude/boan-sensei/SKILL.md`
- Cursor: `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- Codex: `adapters/codex/AGENTS.md`

자세한 복사/설치 안내는 `adapters/INSTALL.md`에 있습니다.

각 도구가 요구하는 위치에 adapter 파일을 복사하거나 연결합니다. adapter는 언제 `boan-sensei`를 실행할지, 어떤 mode를 사용할지, 결과를 어떤 표현으로 조심스럽게 안내할지 정의합니다.

설치 스크립트도 사용할 수 있습니다.

```bash
scripts/install-adapter.sh codex /path/to/project
scripts/install-adapter.sh cursor /path/to/project
scripts/install-adapter.sh claude /path/to/skills-root
```

Windows PowerShell:

```powershell
.\scripts\install-adapter.ps1 codex C:\path\to\project
.\scripts\install-adapter.ps1 cursor C:\path\to\project
.\scripts\install-adapter.ps1 claude C:\path\to\skills-root
```

도구별 plugin bundle을 설치하려면 다음 스크립트를 사용할 수 있습니다.

```bash
scripts/install-plugin.sh codex /path/to/codex-plugins
scripts/install-plugin.sh cursor /path/to/project
scripts/install-plugin.sh claude /path/to/skills-root
```

adapter가 실행할 로컬 CLI 엔진은 대상 저장소나 작업 공간에서 사용할 수 있어야 합니다. 개발 중에는 이 저장소에서 먼저 빌드합니다.

```bash
pnpm install
pnpm build
```

대상 도구에서 `boan-sensei` 명령을 사용할 수 없다면, adapter는 npm 배포를 전제로 진행하지 말고 사용자에게 로컬 CLI를 어떻게 노출할지 물어봐야 합니다.

## 사용법

adapter가 실행하도록 설계된 기본 명령어는 다음과 같습니다.

```bash
boan-sensei scan
boan-sensei report
boan-sensei todo
```

모드별 보고서 생성:

```bash
boan-sensei scan --mode blue
boan-sensei report --mode blue

boan-sensei scan --mode red
boan-sensei report --mode red

boan-sensei scan --mode purple
boan-sensei report --mode purple
```

향후 패키지 배포를 통해 `npx boan-sensei ...` 형태를 지원할 수는 있지만, npm 배포가 이 프로젝트의 주된 플러그인 전략은 아닙니다.

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

`.boan-sensei/findings.json`을 읽고 선택한 mode에 맞는 Markdown 보고서를 생성합니다.

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

adapter는 이 프로젝트의 핵심 통합 지점입니다.

- `adapters/INSTALL.md`
- `adapters/claude/boan-sensei/SKILL.md`
- `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- `adapters/codex/AGENTS.md`
- `plugins/codex-boan-sensei`
- `plugins/cursor-boan-sensei`
- `plugins/claude-code-boan-sensei`

adapter는 다음 내용을 안내합니다.

- 언제 `boan-sensei`를 사용할지
- `scan`, `report`, `todo`를 어떻게 실행할지
- 어떤 mode를 선택할지
- 결과를 과장하지 않고 표현하는 방법
- 보고서 생성 후 사용자가 직접 확인해야 하는 이유

MCP 서버, 자동 수정, 마켓플레이스형 플러그인 패키징은 현재 범위에 포함하지 않습니다.

`plugins/codex-boan-sensei`는 skill-only Codex 플러그인 스캐폴드입니다. `plugins/cursor-boan-sensei`와 `plugins/claude-code-boan-sensei`는 Cursor와 Claude Code용 plugin-style bundle입니다. 이 번들은 MCP 서버를 추가하지 않습니다.

## 예시

- `examples/frontend-sample`: `scan`, `report`, `todo`를 시험해볼 수 있는 작은 프론트엔드 샘플입니다.
- `examples/adapter-install`: 다른 프로젝트에 adapter 파일을 배치하는 복사 가이드입니다.

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
apps/cli           Node.js CLI 실행 엔진
adapters           AI 코딩툴 사용 안내
templates          향후 템플릿 예시
docs               프로젝트 메모와 설계 문서
examples           실행 및 복사 가능한 사용 예시
plugins            Codex 플러그인 스캐폴드 실험
scripts            adapter 설치 스크립트
```

## 라이선스

이 프로젝트는 무료 오픈소스 소프트웨어로 공개하는 것을 목표로 합니다. 안정 버전 배포 전 저장소 라이선스 파일을 추가해야 합니다.
