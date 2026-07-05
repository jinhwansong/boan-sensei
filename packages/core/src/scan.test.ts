import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { afterEach, describe, expect, test, vi } from "vitest";
import { scanProject } from "./index.js";

const roots: string[] = [];
const execFileAsync = promisify(execFile);

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

function registryLatest(latestVersions: Record<string, string> = {}): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input);
    const packageName = decodeURIComponent(url.split("/").at(-1) ?? "");
    const latest = latestVersions[packageName];
    return {
      ok: Boolean(latest),
      json: async () => ({ "dist-tags": { latest } })
    } as Response;
  }) as unknown as typeof fetch;
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

  test("does not report keyword matches that only appear inside string literals", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/message.ts", "const message = \"innerHTML 대신 textContent를 사용하세요\";\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("keeps keyword findings for actual property access after AST filtering", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/html.ts", "element.innerHTML = html;\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "html-injection",
      status: "needs_review"
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

    const findings = await scanProject(root, { registryFetch: registryLatest() });

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

  test("detects expanded rule candidates with review-oriented risk levels", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/signals.tsx",
      [
        "const aws = 'AKIA1234567890ABCDEF';",
        "const apiKey = 'abcdefghijklmnopqrstuvwxyz123456';",
        "const jwt = 'eyJabc.def.ghi';",
        "const db = 'postgres://user:pass@example.com/app';",
        "headers.set('Access-Control-Allow-Origin', '*');",
        "eval(input);",
        "const fn = new Function(code);",
        "JSON.parse(localStorage.getItem('profile') || '{}');",
        "debugger;",
        "const skipAuth = true;",
        "<input type=\"file\" />"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings.map((finding) => finding.category)).toEqual([
      "secret",
      "secret",
      "secret",
      "secret",
      "cors",
      "dynamic-execution",
      "dynamic-execution",
      "browser-storage",
      "dynamic-data-parse",
      "debug-dev-leftover",
      "debug-dev-leftover",
      "file-upload"
    ]);
    expect(findings.filter((finding) => finding.category === "secret").every((finding) => finding.risk === "high")).toBe(true);
    expect(findings.find((finding) => finding.category === "file-upload")?.status).toBe("low_confidence");
  });

  test("does not report expanded rule candidates inside whole-line comments", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/commented.ts",
      [
        "// const aws = 'AKIA1234567890ABCDEF';",
        "/* eval(input); */",
        "const safe = true;"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("does not report rule candidates that only appear in trailing comments", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/trailing-comment.ts", "const safe = true; // AKIA1234567890ABCDEF\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("does not flag file inputs that already declare accept", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/upload.tsx", "<input type=\"file\" accept=\"image/*\" />\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("does not flag multiline file inputs when accept is present in the same tag", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/Upload.tsx",
      ["<input", "  type=\"file\"", "  accept=\"image/*\"", "/>"].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("flags multiline file inputs without accept as low confidence", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/Upload.tsx", ["<input", "  type=\"file\"", "/>"].join("\n"));

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "file-upload",
      status: "low_confidence",
      title: "파일 업로드 accept 속성 확인 필요"
    });
  });

  test("collects CSP review candidates from static HTML entry files", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "index.html", "<html><head></head><body></body></html>\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "csp",
      risk: "low",
      title: "CSP 정책 확인 필요"
    });
    expect(findings[0].message).toContain("정적 HTML");
  });

  test("collects CSP unsafe directive candidates without confirming exploitability", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "index.html",
      "<meta http-equiv=\"Content-Security-Policy\" content=\"script-src 'self' 'unsafe-inline'\">\n"
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "csp",
      risk: "medium",
      title: "CSP unsafe directive 확인 필요"
    });
    expect(findings[0].message).toContain("검토를 권장합니다");
  });

  test("honors .boan-senseiignore file and directory patterns", async () => {
    const root = await makeProject();
    await writeProjectFile(root, ".boan-senseiignore", ["src/generated/", "*.test.ts"].join("\n"));
    await writeProjectFile(root, "src/generated/Unsafe.ts", "eval(input);\n");
    await writeProjectFile(root, "src/Auth.test.ts", "localStorage.getItem('token');\n");
    await writeProjectFile(root, "src/keep.ts", "document.cookie;\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0].evidence.filePath).toBe("src/keep.ts");
  });

  test("scans only changed supported files when diff option is enabled", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/changed.ts", "localStorage.getItem('token');\n");
    await writeProjectFile(root, "src/unchanged.ts", "document.cookie;\n");
    await execFileAsync("git", ["init"], { cwd: root });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: root });
    await execFileAsync("git", ["config", "user.name", "Test User"], { cwd: root });
    await execFileAsync("git", ["add", "."], { cwd: root });
    await execFileAsync("git", ["commit", "-m", "initial"], { cwd: root });
    await writeProjectFile(root, "src/changed.ts", "localStorage.getItem('token');\nconsole.log('debug');\n");

    const findings = await scanProject(root, { diff: true });

    expect(findings.map((finding) => finding.evidence.filePath)).toEqual(["src/changed.ts", "src/changed.ts"]);
    expect(findings.map((finding) => finding.title)).toEqual([
      "localStorage 사용 검토 권장",
      "console.log 출력 확인 필요"
    ]);
  });

  test("backs up previous findings and prints history diff when writing", async () => {
    const root = await makeProject();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await writeProjectFile(root, "src/app.ts", "localStorage.getItem('token');\n");
    await scanProject(root, { write: true });
    await writeProjectFile(root, "src/app.ts", "document.cookie;\nconsole.log('debug');\n");

    await scanProject(root, { write: true });

    const previous = JSON.parse(await readFile(join(root, ".boan-sensei", "findings.prev.json"), "utf8"));
    expect(previous.findings[0].title).toBe("localStorage 사용 검토 권장");
    expect(logSpy).toHaveBeenCalledWith("boan-sensei: findings diff +2 new, -1 resolved");
    logSpy.mockRestore();
  });

  test("collects registry latest-version candidates without treating them as vulnerabilities", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", JSON.stringify({ dependencies: { axios: "1.6.0" } }));
    await writeProjectFile(root, "package-lock.json", JSON.stringify({
      packages: {
        "node_modules/axios": { version: "1.6.0" }
      }
    }));

    const findings = await scanProject(root, { registryFetch: registryLatest({ axios: "1.7.0" }) });

    expect(findings.map((finding) => finding.title)).toContain("axios 최신 버전 확인 필요");
    expect(findings.find((finding) => finding.title === "axios 최신 버전 확인 필요")?.message).toContain("취약점 판단이 아니라");
  });

  test("skips registry latest-version candidates when registry fetch fails", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", JSON.stringify({ dependencies: { axios: "1.6.0" } }));
    await writeProjectFile(root, "package-lock.json", JSON.stringify({
      packages: {
        "node_modules/axios": { version: "1.6.0" }
      }
    }));

    const failingFetch = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;

    const findings = await scanProject(root, { registryFetch: failingFetch });

    expect(findings.map((finding) => finding.title)).toEqual(["axios 버전 확인 필요"]);
  });

  test("reports simple package-lock version mismatches for tracked packages", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", JSON.stringify({ dependencies: { axios: "1.6.0" } }));
    await writeProjectFile(root, "package-lock.json", JSON.stringify({
      packages: {
        "node_modules/axios": { version: "1.5.0" }
      }
    }));

    const findings = await scanProject(root, { registryFetch: registryLatest() });

    expect(findings.map((finding) => finding.title)).toEqual([
      "axios 버전 확인 필요",
      "axios lockfile 버전 확인 필요"
    ]);
  });

  test("does not treat semver ranges as lockfile mismatches when a resolved version is present", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", JSON.stringify({ dependencies: { axios: "^1.6.0" } }));
    await writeProjectFile(root, "package-lock.json", JSON.stringify({
      packages: {
        "node_modules/axios": { version: "1.6.1" }
      }
    }));

    const findings = await scanProject(root, { registryFetch: registryLatest() });

    expect(findings.map((finding) => finding.title)).toEqual(["axios 버전 확인 필요"]);
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
