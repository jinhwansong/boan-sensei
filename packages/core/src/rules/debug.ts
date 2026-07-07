import type { ScanRule } from "./types.js";

export const DEBUG_RULES: ScanRule[] = [
  {
    pattern: /\bconsole\.(?:log|debug|info|warn|error)\s*\(/,
    category: "debug-output",
    risk: "low",
    title: "console.log 출력 확인 필요",
    message: "운영 번들에 민감 정보가 로그로 남지 않는지 확인을 권장합니다."
  },
  {
    pattern: /\bdebugger\s*;/,
    category: "debug-dev-leftover",
    risk: "low",
    title: "debugger 잔재 확인 필요",
    message: "운영 반영 전 제거 또는 의도 여부 확인이 필요한 디버그 잔재 후보입니다."
  },
  {
    pattern: /\b(?:skipAuth|bypassAuth|TEST_MODE|DEBUG_MODE)\b/,
    category: "debug-dev-leftover",
    risk: "medium",
    title: "인증 우회/디버그 플래그 후보 확인 필요",
    message: "개발 또는 테스트용 플래그 후보가 발견되었습니다. 인증 우회 흐름이 실제 운영 코드에 남아있는지 우선 확인이 필요합니다."
  }
];
