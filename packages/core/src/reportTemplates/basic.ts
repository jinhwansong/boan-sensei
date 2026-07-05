import type { Finding, ReportOptions } from "../types.js";

export const BASIC_DISCLAIMER =
  "이 보고서는 프론트엔드 보안 점검 후보를 정리하는 보조 자료이며, 침투 테스트/보안 인증/전문 보안 진단을 대체하지 않습니다.";

export function generateBasicReport(findings: Finding[], options: ReportOptions = {}): string {
  const projectRoot = options.projectRoot ?? process.cwd();
  const riskCounts = countByRisk(findings);

  return [
    "# SECURITY_REPORT",
    "",
    "## 1. 개요",
    "",
    "boan-sensei가 프론트엔드 코드에서 보안 검토가 필요한 후보를 수집한 결과입니다. 모든 항목은 확인이 필요한 점검 후보이며, 실제 영향 여부는 개발자 또는 보안 담당자의 추가 검토가 필요합니다.",
    "",
    "## 2. 점검 범위",
    "",
    `- 기준 경로: \`${projectRoot}\``,
    "- 검사 대상: `src` 하위의 `.js`, `.jsx`, `.ts`, `.tsx`, `.vue` 파일과 루트 `package.json`",
    "- 제외 경로: `node_modules`, `dist`, `build`, `.next`, `.git`, `coverage`",
    "- 검사 방식: 지정 키워드 기반 정적 후보 수집과 의존성 메타데이터 확인",
    "",
    "## 3. 점검 결과 요약",
    "",
    renderRiskSummary(findings, riskCounts),
    "",
    "## 4. 상세 점검 후보",
    "",
    findings.length === 0 ? "현재 규칙 기준으로 확인할 점검 후보가 없습니다." : renderFindingDetails(findings),
    "",
    "## 5. 추가 확인 필요 사항",
    "",
    "- 각 후보 코드가 실제 운영 번들에 포함되는지 확인 필요",
    "- 값의 출처, 사용자 입력 포함 여부, 외부 도메인 연동 여부 확인 필요",
    "- 환경 변수와 로그에 민감 정보가 포함되지 않는지 확인 필요",
    "- 프레임, 새 창, 메시징 흐름의 보안 속성 적용 여부 확인 필요",
    "",
    "## 6. 안내 문구",
    "",
    BASIC_DISCLAIMER,
    ""
  ].join("\n");
}

export function renderFindingDetails(findings: Finding[]): string {
  return findings
    .map((finding) =>
      [
        `### ${finding.id} ${finding.title}`,
        "",
        `- category: \`${finding.category}\``,
        `- risk: \`${finding.risk}\``,
        `- status: \`${finding.status}\``,
        `- 위치: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``,
        `- 메시지: ${finding.message}`,
        "",
        "```text",
        finding.evidence.linePreview,
        "```"
      ].join("\n")
    )
    .join("\n\n");
}

export function renderRiskSummary(findings: Finding[], riskCounts = countByRisk(findings)): string {
  return [
    `- 전체 점검 후보: ${findings.length}건`,
    `- high: ${riskCounts.high}건`,
    `- medium: ${riskCounts.medium}건`,
    `- low: ${riskCounts.low}건`
  ].join("\n");
}

export function countByRisk(findings: Finding[]) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.risk] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

export function renderEmptyOrList(findings: Finding[], renderItem: (finding: Finding) => string): string {
  if (findings.length === 0) {
    return "현재 규칙 기준으로 확인할 점검 후보가 없습니다.";
  }

  return findings.map(renderItem).join("\n\n");
}
