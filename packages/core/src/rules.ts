import type { FindingRisk } from "./types.js";

export interface ScanRule {
  keyword: string;
  category: string;
  risk: FindingRisk;
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
    risk: "high",
    title: "dangerouslySetInnerHTML 사용 검토 권장",
    message: "렌더링되는 HTML의 출처와 정제 여부를 확인해야 하는 점검 후보입니다."
  },
  {
    keyword: "innerHTML",
    category: "html-injection",
    risk: "high",
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
  }
];
