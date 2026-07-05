import { renderEmptyOrList, renderRiskSummary } from "./basic.js";
import type { Finding, ReportOptions } from "../types.js";

const RED_NOTICE =
  "본 문서는 실제 공격 또는 침투 테스트를 수행하지 않습니다. 우회 또는 익스플로잇 자동화를 수행하지 않으며, 확인된 코드 신호를 바탕으로 공격자 관점에서 검토할 질문을 정리한 시뮬레이션 자료입니다.";

export function generateRedReport(findings: Finding[], options: ReportOptions = {}): string {
  const projectRoot = options.projectRoot ?? process.cwd();

  return [
    "# SECURITY_RED_TEAM_SIMULATION",
    "",
    "## 1. 개요",
    "",
    "이 보고서는 프론트엔드 코드 신호를 바탕으로 공격자 관점 검토 질문을 정리합니다. 실행 절차나 자동화 방법이 아니라, 방어 검토를 돕기 위한 질문 목록입니다.",
    "",
    "## 2. 안전 안내",
    "",
    RED_NOTICE,
    "",
    "## 3. 점검 범위",
    "",
    `- 기준 경로: \`${projectRoot}\``,
    "- 검사 방식: 지정 키워드 기반 정적 후보 수집",
    "- 관점: 공격자 관점 검토 질문",
    "",
    "## 4. 점검 결과 요약",
    "",
    renderRiskSummary(findings),
    "",
    "## 5. 공격자 관점 검토 질문",
    "",
    renderEmptyOrList(findings, renderRedFinding),
    "",
    "## 6. 안내 문구",
    "",
    "모든 질문은 코드 리뷰와 방어 보강을 위한 검토 자료입니다. 실제 영향 여부는 사용자가 직접 확인해야 합니다.",
    ""
  ].join("\n");
}

function renderRedFinding(finding: Finding): string {
  return [
    `### ${finding.id} ${finding.title}`,
    "",
    `- 위치: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``,
    `- 사용 위치 발견: ${finding.message}`,
    "- 공격자 관점 검토 질문:",
    "  - 이 코드 경로가 사용자 입력 또는 외부 데이터를 다루는가?",
    "  - 운영 환경에서 이 값이나 동작이 관찰 가능한가?",
    "  - 허용 범위와 검증 조건이 코드 또는 설정으로 명확히 제한되어 있는가?"
  ].join("\n");
}
