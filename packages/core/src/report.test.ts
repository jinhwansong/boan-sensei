import { describe, expect, test } from "vitest";
import { generatePrComment, generateReport, generateTodo, type Finding } from "./index.js";

const findings: Finding[] = [
  {
    id: "BS-0001",
    category: "html-injection",
    risk: "high",
    status: "needs_review",
    title: "dangerouslySetInnerHTML 사용 검토 권장",
    message: "렌더링되는 HTML의 출처와 정제 여부를 확인해야 하는 점검 후보입니다.",
    evidence: {
      filePath: "src/App.tsx",
      lineNumber: 7,
      linePreview: "<div dangerouslySetInnerHTML={{ __html: html }} />"
    }
  }
];

describe("generateReport", () => {
  test("renders required Markdown sections and non-certification disclaimer", () => {
    const markdown = generateReport(findings, { projectRoot: "/repo" });

    expect(markdown).toContain("# SECURITY_REPORT");
    expect(markdown).toContain("## 1. 개요");
    expect(markdown).toContain("## 2. 점검 범위");
    expect(markdown).toContain("## 3. 점검 결과 요약");
    expect(markdown).toContain("## 4. 상세 점검 후보");
    expect(markdown).toContain("## 5. 추가 확인 필요 사항");
    expect(markdown).toContain("## 6. 안내 문구");
    expect(markdown).toContain("침투 테스트/보안 인증/전문 보안 진단을 대체하지 않습니다");
    expect(markdown).toContain("점검 후보");
  });
});

describe("generatePrComment", () => {
  test("formats findings for cautious pull request comments", () => {
    const comment = generatePrComment([
      {
        id: "BS-0002",
        category: "secret",
        risk: "high",
        status: "needs_review",
        title: "하드코딩 시크릿 후보 확인 필요",
        message: "하드코딩 시크릿 후보입니다. 실제 유효성은 확인이 필요합니다.",
        evidence: {
          filePath: "src/config.ts",
          lineNumber: 3,
          linePreview: "const apiKey = '...';"
        }
      }
    ]);

    expect(comment).toContain("## boan-sensei PR review candidates");
    expect(comment).toContain("High review candidates: 1");
    expect(comment).toContain("BS-0002");
    expect(comment).toContain("점검 후보");
    expect(comment).not.toContain("취약점 발견");
  });
});

describe("feedback guidance", () => {
  test("adds false positive feedback guidance to generated outputs", () => {
    const report = generateReport(findings, { projectRoot: "/repo" });
    const todo = generateTodo(findings);
    const comment = generatePrComment(findings);

    for (const output of [report, todo, comment]) {
      expect(output).toContain("GitHub Issues");
      expect(output).toContain("category");
    }
  });
});
