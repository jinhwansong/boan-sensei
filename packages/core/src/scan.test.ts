import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { scanProject } from "./index.js";

const roots: string[] = [];

async function makeProject() {
  const root = await mkdtemp(join(tmpdir(), "boan-sensei-"));
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

describe("scanProject", () => {
  test("collects keyword findings from supported files under src", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/App.tsx",
      "const token = localStorage.getItem('token');\nconsole.log(token);\n"
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.title)).toEqual([
      "localStorage 사용 검토 권장",
      "console.log 출력 확인 필요"
    ]);
    expect(findings[0]).toMatchObject({
      id: "BS-0001",
      category: "browser-storage",
      risk: "medium",
      status: "needs_review",
      evidence: {
        filePath: "src/App.tsx",
        lineNumber: 1,
        linePreview: "const token = localStorage.getItem('token');"
      }
    });
  });

  test("ignores excluded directories, files outside src, and unsupported extensions", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/keep.ts", "window.open('/help');\n");
    await writeProjectFile(root, "src/readme.md", "localStorage\n");
    await writeProjectFile(root, "node_modules/pkg/index.ts", "localStorage\n");
    await writeProjectFile(root, "build/bundle.ts", "document.cookie\n");
    await writeProjectFile(root, "pages/index.tsx", "dangerouslySetInnerHTML\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.filePath).toBe("src/keep.ts");
    expect(findings[0].title).toBe("window.open 사용 검토 권장");
  });

  test("detects multiple frontend risk indicators in the same line", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/Link.vue",
      "<a target=\"_blank\" @click=\"postMessage('hello')\">open</a>\n"
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.category)).toEqual([
      "navigation",
      "cross-window-messaging"
    ]);
    expect(findings.every((finding) => finding.status === "needs_review")).toBe(true);
    expect(findings.every((finding) => finding.message.includes("검토") || finding.message.includes("확인"))).toBe(true);
  });

  test("ignores whole-line comments and single-line block comments", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/comments.ts",
      [
        "// innerHTML 쓰지 말라는 뜻으로 남긴 주석",
        "/* localStorage 사용 금지 안내 */",
        "element.innerHTML = html;"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "html-injection",
      status: "needs_review",
      evidence: {
        filePath: "src/comments.ts",
        lineNumber: 3,
        linePreview: "element.innerHTML = html;"
      }
    });
  });

  test("marks keyword matches inside simple string literal assignments as low confidence", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/message.ts", "const message = \"innerHTML 대신 textContent를 사용하세요\";\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "html-injection",
      status: "low_confidence",
      evidence: {
        filePath: "src/message.ts",
        lineNumber: 1
      }
    });
  });

  test("collects dependency review candidates from package.json and missing lockfile", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", JSON.stringify({
      dependencies: {
        axios: "^1.7.0",
        react: "^18.3.0"
      },
      devDependencies: {
        vite: "^5.0.0"
      }
    }));

    const findings = await scanProject(root);

    expect(findings.map((finding) => finding.title)).toEqual([
      "axios 버전 확인 필요",
      "react 버전 확인 필요",
      "vite 버전 확인 필요",
      "lockfile 존재 확인 필요"
    ]);
    expect(findings.every((finding) => finding.category === "dependency")).toBe(true);
    expect(findings.every((finding) => finding.risk === "low")).toBe(true);
    expect(findings.every((finding) => finding.status === "needs_review")).toBe(true);
    expect(findings[0].evidence).toMatchObject({
      filePath: "package.json",
      lineNumber: 1,
      linePreview: "dependencies.axios: ^1.7.0"
    });
    expect(findings[3].message).toContain("lockfile");
  });

  test("writes findings and basic mode to .boan-sensei/findings.json by default", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/env.ts", "const api = import.meta.env.VITE_API_URL;\n");

    await scanProject(root, { write: true });

    const stored = JSON.parse(await readFile(join(root, ".boan-sensei", "findings.json"), "utf8"));
    expect(stored.mode).toBe("basic");
    expect(stored.findings).toHaveLength(1);
    expect(stored.findings[0].title).toBe("VITE_ 공개 환경 변수 확인 필요");
  });
});
