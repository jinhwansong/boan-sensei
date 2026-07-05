# boan-sensei

`boan-sensei`는 프론트엔드 프로젝트에서 보안 점검 후보를 수집하고, 개발자용/내부 공유용 Markdown 보고서를 생성하는 무료 오픈소스 CLI 도구입니다.

이 도구는 실제 취약 여부를 확정하거나 침투 테스트를 수행하지 않습니다. 결과는 항상 **점검 후보**, **확인 필요**, **검토 권장** 수준으로 다루어야 하며, 최종 판단은 개발자와 보안 담당자가 직접 확인해야 합니다.

> English: `boan-sensei` is a free open-source CLI that collects frontend security review candidates and generates developer-friendly Markdown reports. It does not confirm vulnerabilities or replace professional security assessment.

## 왜 만들었나요

프론트엔드 코드에는 보안 검토가 필요한 흔적이 자주 숨어 있습니다. 브라우저 저장소, 공개 환경 변수, `postMessage`, `iframe`, `dangerouslySetInnerHTML` 같은 코드는 상황에 따라 문제 없을 수도 있고, 추가 확인이 필요한 지점일 수도 있습니다.

`boan-sensei`는 이런 흔적을 단정하지 않고, 사람이 확인하기 좋은 후보 목록으로 정리합니다.

## 빠른 사용법

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

mode를 지정할 수도 있습니다. 기본값은 `basic`입니다.

```bash
npx boan-sensei scan --mode blue
npx boan-sensei report --mode blue
```

현재 레포에서 개발 중인 CLI를 실행하려면:

```bash
pnpm install
pnpm build
pnpm --filter boan-sensei exec boan-sensei scan --mode basic
```

## Mode

| mode | 보고서 파일 | 목적 |
| --- | --- | --- |
| `basic` | `SECURITY_REPORT.md` | 기본 보안 점검 후보 보고서 |
| `blue` | `SECURITY_BLUE_TEAM.md` | 방어자 관점의 확인 항목, 권장 조치, 운영 반영 전 검토 |
| `red` | `SECURITY_RED_TEAM_SIMULATION.md` | 공격자 관점 검토 질문 정리. 실제 공격, 침투, 우회 자동화를 수행하지 않음 |
| `purple` | `SECURITY_PURPLE_TEAM.md` | Red 관점 질문과 Blue 조치를 한 쌍으로 정리 |

## CLI 출력 예시

```text
boan-sensei: basic mode로 점검 후보 1건을 .boan-sensei/findings.json에 저장했습니다.
보안선생 한마디: localStorage 냄새가 납니다. 토큰 저장 여부만 확인해봅시다.
```

CLI 출력은 AI 코딩툴 컨텍스트를 과하게 채우지 않도록 짧게 유지합니다. 상세 라인, 파일 경로, 메시지는 `.boan-sensei/findings.json`과 Markdown 보고서에서 확인합니다.

## 명령어

### `boan-sensei scan [--mode basic|blue|red|purple]`

현재 작업 디렉터리를 기준으로 `src` 하위 파일을 검사하고 다음 파일을 생성합니다.

```text
.boan-sensei/findings.json
```

`findings.json`에는 사용한 mode도 함께 저장됩니다.

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

v0.1 키워드 후보:

- `localStorage`
- `sessionStorage`
- `document.cookie`
- `dangerouslySetInnerHTML`
- `innerHTML`
- `iframe`
- `target="_blank"`
- `window.open`
- `postMessage`
- `NEXT_PUBLIC_`
- `VITE_`
- `sourcemap`
- `sourceMap`
- `console.log`

### `boan-sensei report [--mode basic|blue|red|purple]`

`.boan-sensei/findings.json`을 읽고 mode에 맞는 보고서를 생성합니다.

```text
SECURITY_REPORT.md
SECURITY_BLUE_TEAM.md
SECURITY_RED_TEAM_SIMULATION.md
SECURITY_PURPLE_TEAM.md
```

### `boan-sensei todo`

`.boan-sensei/findings.json`을 읽고 개발자 체크리스트를 생성합니다.

```text
SECURITY_TODO.md
```

## Finding 구조

```ts
{
  id: string;
  category: string;
  risk: "high" | "medium" | "low";
  status: "needs_review";
  title: string;
  message: string;
  evidence: {
    filePath: string;
    lineNumber: number;
    linePreview: string;
  };
}
```

## 프로젝트 구조

```text
packages/core      핵심 스캔, 보고서, TODO 생성 로직
apps/cli           Node.js CLI 엔트리포인트
adapters           Claude Code, Cursor, Codex 사용 안내 초안
templates          향후 Markdown 템플릿과 예시 출력 위치
docs               프로젝트 철학, 설계 메모, 향후 문서
```

## 개발

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## v0.1 범위 밖

- 실제 취약 여부 확정
- 침투 테스트
- 보안 인증
- MCP 서버
- Claude Skill 배포 자동화
- Cursor Rule 배포 자동화
- Codex Plugin 구현

## 보안 안내

`boan-sensei`가 생성하는 보고서는 프론트엔드 보안 점검 후보를 정리하는 보조 자료입니다. 침투 테스트, 보안 인증, 전문 보안 진단을 대체하지 않습니다.
