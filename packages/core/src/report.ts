import { resolveMode } from "./modes.js";
import { generateBasicReport } from "./reportTemplates/basic.js";
import { generateBlueReport } from "./reportTemplates/blue.js";
import { generatePurpleReport } from "./reportTemplates/purple.js";
import { generateRedReport } from "./reportTemplates/red.js";
import type { Finding, ReportOptions } from "./types.js";

export function generateReport(findings: Finding[], options: ReportOptions = {}): string {
  const mode = resolveMode(options.mode);

  if (mode === "blue") {
    return generateBlueReport(findings, options);
  }

  if (mode === "red") {
    return generateRedReport(findings, options);
  }

  if (mode === "purple") {
    return generatePurpleReport(findings, options);
  }

  return generateBasicReport(findings, options);
}

export function generateTodo(findings: Finding[]): string {
  const lines = [
    "# SECURITY_TODO",
    "",
    "boan-sensei가 수집한 프론트엔드 보안 점검 후보를 개발자 TODO 체크리스트로 정리했습니다.",
    ""
  ];

  if (findings.length === 0) {
    lines.push("- [ ] 현재 규칙 기준으로 추가 검토할 점검 후보가 없는지 팀 기준으로 재확인");
    lines.push("");
    return lines.join("\n");
  }

  for (const finding of findings) {
    lines.push(`- [ ] ${finding.id} ${finding.title}`);
    lines.push(`  - 위치: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``);
    lines.push(`  - 확인: ${finding.message}`);
    lines.push(`  - 상태: ${finding.status}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function generatePrComment(findings: Finding[]): string {
  const highCount = findings.filter((finding) => finding.risk === "high").length;
  const mediumCount = findings.filter((finding) => finding.risk === "medium").length;
  const lowCount = findings.filter((finding) => finding.risk === "low").length;
  const lines = [
    "## boan-sensei PR review candidates",
    "",
    `High review candidates: ${highCount}`,
    `Medium review candidates: ${mediumCount}`,
    `Low review candidates: ${lowCount}`,
    "",
    "boan-sensei는 정적 코드 신호를 점검 후보로 정리합니다. 실제 취약점 여부는 소유 권한이 있는 프로젝트 맥락에서 추가 확인이 필요합니다.",
    ""
  ];

  if (findings.length === 0) {
    lines.push("- 현재 규칙 기준으로 PR 코멘트에 올릴 점검 후보가 없습니다.");
    lines.push("");
    return lines.join("\n");
  }

  for (const finding of findings.slice(0, 20)) {
    lines.push(`- ${finding.id} ${finding.title}`);
    lines.push(`  - Risk: ${finding.risk}`);
    lines.push(`  - Location: \`${finding.evidence.filePath}:${finding.evidence.lineNumber}\``);
    lines.push(`  - Check: ${finding.message}`);
  }

  if (findings.length > 20) {
    lines.push("");
    lines.push(`_Additional review candidates omitted from this comment: ${findings.length - 20}_`);
  }

  lines.push("");
  return lines.join("\n");
}
