import type { ScanRule } from "./types.js";

export const DOM_RULES: ScanRule[] = [
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
    pattern: /<embed\b/i,
    category: "embedding",
    risk: "low",
    title: "embed usage review recommended",
    message: "External content embed candidate. Verify source allowlist and embedding policy."
  },
  {
    pattern: /<object\b/i,
    category: "embedding",
    risk: "low",
    title: "object usage review recommended",
    message: "External content object candidate. Verify source allowlist and embedding policy."
  },
  {
    pattern: /\btarget\s*=\s*(?:"_blank"|'_blank'|\{\s*["_']_blank["_']\s*\})/i,
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
  }
];
