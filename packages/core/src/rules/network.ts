import type { ScanRule } from "./types.js";

export const NETWORK_RULES: ScanRule[] = [
  {
    keyword: "postMessage",
    category: "cross-window-messaging",
    risk: "medium",
    title: "postMessage 사용 검토 권장",
    message: "메시지 origin 검증과 수신 데이터 검증 여부를 확인해야 합니다."
  },
  {
    pattern: /addEventListener\s*\(\s*["']message["']/,
    category: "cross-window-messaging",
    risk: "medium",
    title: "message event listener review recommended",
    message: "Message event listener candidate. Verify event.origin allowlist and received data validation.",
    redQuestion: "Could a message from an untrusted origin reach this handler without an origin allowlist check?"
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
    pattern: /Access-Control-Allow-Origin.*["'`]\*["'`]/,
    category: "cors",
    risk: "medium",
    title: "CORS 와일드카드 설정 확인 필요",
    message: "Access-Control-Allow-Origin 와일드카드 설정 후보가 발견되었습니다. 허용 범위가 의도와 맞는지 검토를 권장합니다."
  }
];
