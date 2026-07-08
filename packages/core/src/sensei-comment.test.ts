import { describe, expect, test } from "vitest";
import { getSenseiComment, type Finding } from "./index.js";

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: "BS-0001",
    ruleId: "browser-storage.local-storage",
    confidence: "medium",
    category: "browser-storage",
    risk: "medium",
    status: "needs_review",
    recommendation: "Verify browser storage usage in project context.",
    title: "localStorage 사용 검토 권장",
    message: "브라우저 저장소에 민감 정보가 저장되는지 확인해야 하는 점검 후보입니다.",
    evidence: {
      filePath: "src/App.tsx",
      lineNumber: 1,
      linePreview: "localStorage.getItem('token')"
    },
    ...overrides
  };
}

describe("getSenseiComment", () => {
  test("returns a memorable but cautious comment for localStorage candidates", () => {
    const comment = getSenseiComment([finding({ category: "browser-storage" })]);

    expect(comment).toBe("localStorage 냄새가 납니다. 토큰 저장 여부만 확인해봅시다.");
    expect(comment).toContain("확인");
  });

  test("prefers high-signal HTML injection candidates", () => {
    const comment = getSenseiComment([
      finding({ category: "browser-storage" }),
      finding({ category: "html-injection", title: "dangerouslySetInnerHTML 사용 검토 권장" })
    ]);

    expect(comment).toBe("dangerouslySetInnerHTML은 이름부터 조심하라고 말하고 있습니다.");
  });

  test("keeps the no-finding comment short and non-definitive", () => {
    const comment = getSenseiComment([]);

    expect(comment).toBe("오늘은 조용합니다. 그래도 중요한 흐름은 사람이 한 번 더 확인합시다.");
    expect(comment).not.toContain("안전");
  });
});
