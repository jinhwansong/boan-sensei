import type { Finding } from "./types.js";

const FALLBACK_COMMENT = "점검 후보를 정리했습니다. 자세한 판단은 보고서에서 차분히 확인합시다.";

export function getSenseiComment(findings: Finding[]): string {
  if (findings.length === 0) {
    return "오늘은 조용합니다. 그래도 중요한 흐름은 사람이 한 번 더 확인합시다.";
  }

  if (hasCategory(findings, "html-injection")) {
    const dangerous = findings.find((finding) => finding.title.includes("dangerouslySetInnerHTML"));
    if (dangerous) {
      return "dangerouslySetInnerHTML은 이름부터 조심하라고 말하고 있습니다.";
    }
    return "HTML을 직접 만지는 코드는 늘 출처부터 확인해봅시다.";
  }

  if (hasCategory(findings, "browser-storage")) {
    return "localStorage 냄새가 납니다. 토큰 저장 여부만 확인해봅시다.";
  }

  if (hasCategory(findings, "embedding")) {
    return "iframe은 죄가 없습니다. 허용 범위가 없을 때부터 사건이 시작됩니다.";
  }

  if (hasCategory(findings, "cross-window-messaging")) {
    return "postMessage는 대화입니다. 상대 origin부터 확인해봅시다.";
  }

  if (hasCategory(findings, "public-env")) {
    return "공개 환경 변수는 공개됩니다. 이름보다 값이 더 중요합니다.";
  }

  return FALLBACK_COMMENT;
}

function hasCategory(findings: Finding[], category: string): boolean {
  return findings.some((finding) => finding.category === category);
}
