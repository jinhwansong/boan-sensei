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
