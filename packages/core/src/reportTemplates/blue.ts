import { BASIC_DISCLAIMER, renderEmptyOrList, renderRiskSummary } from "./basic.js";
import type { Finding, ReportOptions } from "../types.js";

export function generateBlueReport(findings: Finding[], options: ReportOptions = {}): string {
  const projectRoot = options.projectRoot ?? process.cwd();

  return [
    "# SECURITY_BLUE_TEAM",
    "",
    "## 1. 개요",
    "",
    "이 보고서는 방어자 관점에서 프론트엔드 보안 점검 후보를 정리합니다. 운영 반영 전 확인 항목과 권장 조치를 중심으로 작성되었습니다.",
    "",
    "## 2. 점검 범위",
    "",
    `- 기준 경로: \`${projectRoot}\``,
    "- 검사 방식: 지정 키워드 기반 정적 후보 수집과 의존성 메타데이터 확인",
    "- 관점: 방어자 확인 항목과 운영 반영 전 검토",
    "",
    "## 3. 점검 결과 요약",
    "",
    renderRiskSummary(findings),
    "",
    "## 4. Blue Team 확인 항목",
    "",
    renderEmptyOrList(findings, renderBlueFinding),
    "",
    "## 5. 운영 반영 전 검토 사항",
    "",
    "- 후보 코드가 운영 번들에 포함되는지 확인 필요",
    "- 민감 정보가 클라이언트 저장소, 로그, 공개 환경 변수에 포함되는지 확인 필요",
    "- 외부 도메인, 새 창, 메시징 흐름의 허용 범위가 문서화되어 있는지 검토 권장",
    "- 검토 결과와 조치 여부를 팀 내부 이슈 또는 변경 기록에 남기는 것을 권장",
    "",
    "## 6. 안내 문구",
    "",
    BASIC_DISCLAIMER,
    ""
  ].join("\n");
}

function renderBlueFinding(finding: Finding): string {
  return [
    `### ${finding.id} ${finding.title}`,
    "",
    `- 위치: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``,
    `- 확인 항목: ${finding.message}`,
    "- 권장 조치: 값의 출처, 노출 범위, 운영 반영 필요성을 확인하고 필요한 경우 대체 구현 또는 보강 설정을 검토합니다.",
    "- 운영 반영 전 확인 필요: 실제 사용자 데이터, 인증 흐름, 외부 연동과 연결되는지 확인합니다."
  ].join("\n");
}
