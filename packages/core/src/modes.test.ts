import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import {
  generateReport,
  REPORT_FILE_BY_MODE,
  resolveMode,
  scanProject,
  type Finding
} from "./index.js";

const roots: string[] = [];

const sampleFinding: Finding = {
  id: "BS-0001",
  ruleId: "html-injection.dangerously-set-inner-html",
  confidence: "high",
  category: "html-injection",
  risk: "high",
  status: "needs_review",
  recommendation: "Verify the HTML input source and sanitization path.",
  title: "dangerouslySetInnerHTML 사용 검토 권장",
  message: "렌더링되는 HTML의 출처와 정제 여부를 확인해야 하는 점검 후보입니다.",
  evidence: {
    filePath: "src/App.tsx",
    lineNumber: 7,
    linePreview: "<div dangerouslySetInnerHTML={{ __html: html }} />"
  }
};

async function makeProject() {
  const root = await mkdtemp(join(tmpdir(), "boan-sensei-mode-"));
  roots.push(root);
  await mkdir(join(root, "src"), { recursive: true });
  return root;
}

async function writeProjectFile(root: string, filePath: string, contents: string) {
  const fullPath = join(root, filePath);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, "utf8");
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("boan modes", () => {
  test("defaults to basic mode", async () => {
    expect(resolveMode(undefined)).toBe("basic");

    const root = await makeProject();
    await writeProjectFile(root, "src/App.tsx", "console.log('check');\n");

    await scanProject(root, { write: true });

    const stored = JSON.parse(await readFile(join(root, ".boan-sensei", "findings.json"), "utf8"));
    expect(stored.mode).toBe("basic");
  });

  test("maps every mode to the expected report file name", () => {
    expect(REPORT_FILE_BY_MODE).toEqual({
      basic: "SECURITY_REPORT.md",
      blue: "SECURITY_BLUE_TEAM.md",
      red: "SECURITY_RED_TEAM_SIMULATION.md",
      purple: "SECURITY_PURPLE_TEAM.md"
    });
  });

  test("red mode report includes a safety notice", () => {
    const markdown = generateReport([sampleFinding], { mode: "red", projectRoot: "/repo" });

    expect(markdown).toContain("실제 공격 또는 침투 테스트를 수행하지 않습니다");
    expect(markdown).toContain("공격자 관점 검토 질문");
  });

  test("purple mode report pairs Red questions and Blue actions", () => {
    const markdown = generateReport([sampleFinding], { mode: "purple", projectRoot: "/repo" });

    expect(markdown).toContain("Red 관점");
    expect(markdown).toContain("Blue 조치");
  });

  test("invalid mode input returns a clear error", () => {
    expect(() => resolveMode("orange")).toThrow(
      "지원하지 않는 mode입니다. basic/blue/red/purple 중 하나를 사용하세요."
    );
  });
});
