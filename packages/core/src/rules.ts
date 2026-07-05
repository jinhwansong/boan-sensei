import type { FindingRisk, FindingStatus } from "./types.js";

export interface ScanRule {
  keyword?: string;
  pattern?: RegExp;
  category: string;
  risk: FindingRisk;
  status?: FindingStatus;
  title: string;
  message: string;
}

export const SCAN_RULES: ScanRule[] = [
  {
    keyword: "localStorage",
    category: "browser-storage",
    risk: "medium",
    title: "localStorage 사용 검토 권장",
    message: "브라우저 저장소에 민감 정보가 저장되는지 확인해야 하는 점검 후보입니다."
  },
  {
    keyword: "sessionStorage",
    category: "browser-storage",
    risk: "medium",
    title: "sessionStorage 사용 검토 권장",
    message: "세션 저장소에 인증 정보나 개인정보가 저장되는지 확인이 필요합니다."
  },
  {
    keyword: "document.cookie",
    category: "cookie",
    risk: "medium",
    title: "document.cookie 사용 검토 권장",
    message: "쿠키 접근 코드의 보안 속성, 저장 값, 사용 목적 검토를 권장합니다."
  },
  {
    keyword: "dangerouslySetInnerHTML",
    category: "html-injection",
    risk: "medium",
    title: "dangerouslySetInnerHTML 사용 검토 권장",
    message: "렌더링되는 HTML의 출처와 정제 여부를 확인해야 하는 점검 후보입니다."
  },
  {
    keyword: "innerHTML",
    category: "html-injection",
    risk: "medium",
    title: "innerHTML 사용 검토 권장",
    message: "동적으로 삽입되는 HTML이 신뢰 가능한 값인지 확인이 필요합니다."
  },
  {
    keyword: "iframe",
    category: "embedding",
    risk: "medium",
    title: "iframe 사용 검토 권장",
    message: "iframe의 출처, sandbox 속성, 권한 범위를 확인해야 하는 점검 후보입니다."
  },
  {
    keyword: "target=\"_blank\"",
    category: "navigation",
    risk: "low",
    title: "target=\"_blank\" 링크 확인 필요",
    message: "새 창 링크에 rel=\"noopener noreferrer\" 적용 여부 확인을 권장합니다."
  },
  {
    keyword: "window.open",
    category: "navigation",
    risk: "low",
    title: "window.open 사용 검토 권장",
    message: "새 창 열기 흐름에서 opener 참조와 이동 대상 검토가 필요합니다."
  },
  {
    keyword: "postMessage",
    category: "cross-window-messaging",
    risk: "medium",
    title: "postMessage 사용 검토 권장",
    message: "메시지 origin 검증과 수신 데이터 검증 여부를 확인해야 합니다."
  },
  {
    keyword: "NEXT_PUBLIC_",
    category: "public-env",
    risk: "medium",
    title: "NEXT_PUBLIC_ 공개 환경 변수 확인 필요",
    message: "클라이언트 번들에 포함되는 값이 민감 정보가 아닌지 확인이 필요합니다."
  },
  {
    keyword: "VITE_",
    category: "public-env",
    risk: "medium",
    title: "VITE_ 공개 환경 변수 확인 필요",
    message: "클라이언트 번들에 포함되는 값이 민감 정보가 아닌지 확인이 필요합니다."
  },
  {
    keyword: "sourcemap",
    category: "source-map",
    risk: "low",
    title: "sourcemap 설정 확인 필요",
    message: "배포 환경에서 소스맵 공개 범위가 의도와 맞는지 확인을 권장합니다."
  },
  {
    keyword: "sourceMap",
    category: "source-map",
    risk: "low",
    title: "sourceMap 설정 확인 필요",
    message: "배포 환경에서 소스맵 공개 범위가 의도와 맞는지 확인을 권장합니다."
  },
  {
    keyword: "console.log",
    category: "debug-output",
    risk: "low",
    title: "console.log 출력 확인 필요",
    message: "운영 번들에 민감 정보가 로그로 남지 않는지 확인을 권장합니다."
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    category: "secret",
    risk: "high",
    title: "AWS 액세스 키 후보 확인 필요",
    message: "하드코딩된 AWS 액세스 키 후보가 발견되었습니다. 실제 유효한 시크릿으로 단정하지 말고 즉시 사용 여부 확인과 교체 검토를 권장합니다."
  },
  {
    pattern: /\b(?:api_key|apiKey|secret|password)\b\s*[:=]\s*["'`][^"'`]{20,}["'`]/,
    category: "secret",
    risk: "high",
    title: "하드코딩 시크릿 후보 확인 필요",
    message: "API 키, secret, password처럼 보이는 긴 문자열 대입 후보가 발견되었습니다. 실제 유효성은 단정하지 말고 저장 위치와 노출 범위 확인을 권장합니다."
  },
  {
    pattern: /["'`]eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+["'`]/,
    category: "secret",
    risk: "high",
    title: "JWT 문자열 후보 확인 필요",
    message: "JWT처럼 보이는 하드코딩 문자열 후보가 발견되었습니다. 실제 토큰 여부를 단정하지 말고 테스트 값인지 확인을 권장합니다."
  },
  {
    pattern: /\b(?:mongodb|postgres|mysql):\/\/[^/\s:@]+:[^@\s]+@/,
    category: "secret",
    risk: "high",
    title: "DB 연결 문자열 후보 확인 필요",
    message: "자격증명이 포함된 DB 연결 문자열 후보가 발견되었습니다. 실제 유효한 접속 정보로 단정하지 말고 노출 여부 확인을 권장합니다."
  },
  {
    pattern: /Access-Control-Allow-Origin.*["'`]\*["'`]/,
    category: "cors",
    risk: "medium",
    title: "CORS 와일드카드 설정 확인 필요",
    message: "Access-Control-Allow-Origin 와일드카드 설정 후보가 발견되었습니다. 허용 범위가 의도와 맞는지 검토를 권장합니다."
  },
  {
    pattern: /\beval\s*\(/,
    category: "dynamic-execution",
    risk: "medium",
    title: "eval 사용 검토 권장",
    message: "동적 실행 코드 후보가 발견되었습니다. 입력 출처와 실행 필요성을 확인해야 합니다."
  },
  {
    pattern: /\bnew\s+Function\s*\(/,
    category: "dynamic-execution",
    risk: "medium",
    title: "new Function 사용 검토 권장",
    message: "동적 함수 생성 코드 후보가 발견되었습니다. 입력 출처와 실행 필요성을 확인해야 합니다."
  },
  {
    pattern: /\bJSON\.parse\s*\(\s*(?:localStorage|document\.cookie|response|data)\b/,
    category: "dynamic-data-parse",
    risk: "medium",
    title: "JSON.parse 입력 출처 확인 필요",
    message: "브라우저 저장소, 쿠키, 응답, 외부 데이터로 보이는 값을 JSON.parse하는 후보가 발견되었습니다. 입력 신뢰성과 예외 처리를 확인해야 합니다."
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
    risk: "low",
    title: "인증 우회/디버그 플래그 후보 확인 필요",
    message: "개발 또는 테스트용 플래그 후보가 발견되었습니다. 운영 반영 전 의도와 적용 범위 확인을 권장합니다."
  },
  {
    pattern: /<input\b(?=[^>]*\btype=["']file["'])(?![^>]*\baccept=)[^>]*>/i,
    category: "file-upload",
    risk: "low",
    status: "low_confidence",
    title: "파일 업로드 accept 속성 확인 필요",
    message: "파일 업로드 입력에서 accept 속성 확인이 필요한 낮은 신뢰도 점검 후보입니다."
  }
];
