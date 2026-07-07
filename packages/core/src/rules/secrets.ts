import type { ScanRule } from "./types.js";

export const SECRET_RULES: ScanRule[] = [
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
    pattern: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/,
    category: "secret",
    risk: "high",
    title: "GitHub token candidate review needed",
    message: "Hardcoded GitHub token-like value candidate. Verify whether this is a real secret before rotation or exposure review."
  },
  {
    pattern: /\b(?:sk_live_|pk_live_)[A-Za-z0-9_]{20,}/,
    category: "secret",
    risk: "high",
    title: "Stripe key candidate review needed",
    message: "Hardcoded Stripe key-like value candidate. Verify whether this value is intended for client exposure before follow-up."
  },
  {
    pattern: /\bAIza[A-Za-z0-9_-]{30,}/,
    category: "secret",
    risk: "high",
    title: "Google API key candidate review needed",
    message: "Hardcoded Google API key-like value candidate. Verify intended exposure and restriction settings."
  },
  {
    pattern: /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
    category: "secret",
    risk: "high",
    title: "Private key block candidate review needed",
    message: "Private key block marker candidate. Verify whether this is test data or a secret that needs handling."
  }
];
