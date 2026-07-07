import { BASIC_DISCLAIMER, FEEDBACK_NOTICE, renderEmptyOrList, renderRiskSummary, renderTopReviewSection } from "./basic.js";
import type { Finding, ReportOptions } from "../types.js";

export function generatePurpleReport(findings: Finding[], options: ReportOptions = {}): string {
  const projectRoot = options.projectRoot ?? process.cwd();

  return [
    "# SECURITY_PURPLE_TEAM",
    "",
    "## 1. 개요",
    "",
    "이 보고서는 Red 관점 질문과 Blue 조치를 한 쌍으로 정리합니다. 공격자 관점 검토 질문을 방어자 조치로 연결해 팀 리뷰에 바로 사용할 수 있도록 돕습니다.",
    "",
    "## 2. 점검 범위",
    "",
    `- 기준 경로: \`${projectRoot}\``,
    "- 검사 방식: 지정 키워드 기반 정적 후보 수집과 의존성 메타데이터 확인",
    "- 관점: Red 질문과 Blue 조치 연결",
    "",
    "## 3. 점검 결과 요약",
    "",
    renderRiskSummary(findings),
    "",
    renderTopReviewSection(findings, options.top),
    "",
    "## 4. Purple Team 매핑",
    "",
    renderEmptyOrList(findings, renderPurpleFinding),
    "",
    "## 5. 안내 문구",
    "",
    BASIC_DISCLAIMER,
    "",
    FEEDBACK_NOTICE,
    ""
  ].join("\n");
}

function renderPurpleFinding(finding: Finding): string {
  return [
    `### ${finding.id} ${finding.title}`,
    "",
    `- 위치: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``,
    "#### Red 관점",
    "",
    "- 공격자 관점 검토 질문: 이 사용 위치가 외부 입력, 공개 값, 브라우저 경계와 연결되는지 확인할 필요가 있는가?",
    "",
    "#### Blue 조치",
    "",
    `- ${finding.message}`,
    "- 운영 반영 전 확인 필요: 허용 범위, 데이터 출처, 로깅 또는 공개 여부를 팀 기준으로 검토합니다.",
    "",
    "#### 보고서 문장",
    "",
    `- ${finding.id}는 ${finding.category} 범주의 점검 후보이며, 운영 반영 전 확인 필요 항목으로 검토 권장합니다.`
  ].join("\n");
}
