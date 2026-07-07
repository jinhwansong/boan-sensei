import type { ScanRule } from "./types.js";

export const DYNAMIC_EXECUTION_RULES: ScanRule[] = [
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
  }
];
