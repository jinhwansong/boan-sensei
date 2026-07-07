import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test, vi } from "vitest";
import { generateReport, scanProject, type Finding } from "./index.js";

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
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("scanProject signal quality heuristics", () => {
  test("classifies public env candidates by sensitive variable names", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/env.ts",
      [
        "const secret = import.meta.env.VITE_SECRET_KEY;",
        "const baseUrl = import.meta.env.VITE_BASE_URL;"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      category: "public-env",
      risk: "medium",
      status: "needs_review"
    });
    expect(findings[1]).toMatchObject({
      category: "public-env",
      risk: "low",
      status: "low_confidence"
    });
  });

  test("classifies public env assignment targets with sensitive names as needs review", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/env.ts", "const SECRET_BASE_URL = import.meta.env.VITE_BASE_URL;\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "public-env",
      risk: "medium",
      status: "needs_review"
    });
  });

  test("classifies console output candidates by sensitive identifiers", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/logging.ts",
      [
        "console.warn(authToken);",
        "console.error('loaded page');",
        "console.debug(password);",
        "console.info('ready');"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings.map((finding) => finding.category)).toEqual([
      "debug-output",
      "debug-output",
      "debug-output",
      "debug-output"
    ]);
    expect(findings.map((finding) => finding.risk)).toEqual(["medium", "low", "medium", "low"]);
    expect(findings.map((finding) => finding.status)).toEqual([
      "needs_review",
      "low_confidence",
      "needs_review",
      "low_confidence"
    ]);
  });

  test("classifies storage candidates by auth and UI state identifiers", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/storage.ts",
      [
        "localStorage.setItem('accessToken', token);",
        "sessionStorage.setItem('theme', theme);",
        "localStorage.setItem('draft', value);"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(3);
    expect(findings.map((finding) => finding.risk)).toEqual(["medium", "low", "low"]);
    expect(findings.map((finding) => finding.status)).toEqual([
      "needs_review",
      "low_confidence",
      "low_confidence"
    ]);
  });

  test("skips target blank candidates when noopener and noreferrer are present", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/links.tsx",
      [
        "<a href=\"https://example.com\" target=\"_blank\">open</a>",
        "<a href=\"https://example.com\" target=\"_blank\" rel=\"noopener noreferrer\">safe</a>",
        "<a rel=\"noreferrer noopener\" href=\"https://example.com\" target=\"_blank\">safe order</a>"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "navigation",
      evidence: {
        lineNumber: 1
      }
    });
  });

  test("collects target blank candidates across quote styles and JSX expressions", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/links.tsx",
      [
        "<a href=\"https://example.com\" target='_blank'>single</a>",
        "<a href=\"https://example.com\" target={'_blank'}>jsx expression</a>",
        "<a href=\"https://example.com\" target='_blank' rel='noreferrer noopener'>safe single</a>",
        "<a rel={'noopener noreferrer'} href=\"https://example.com\" target={'_blank'}>safe jsx</a>"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings.every((finding) => finding.category === "navigation")).toBe(true);
    expect(findings.map((finding) => finding.evidence.lineNumber)).toEqual([1, 2]);
  });

  test("skips candidates inside multiline block comments", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/commented.ts",
      [
        "/*",
        "localStorage.getItem('token');",
        "window.parent.postMessage({ type: 'ready' }, '*');",
        "*/",
        "const safe = true;"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("treats Vue string-only candidates conservatively", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/Message.vue", "<script setup>const message = 'innerHTML should use textContent';</script>\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(0);
  });

  test("classifies dangerouslySetInnerHTML candidates by local sanitization signals", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/html.tsx",
      [
        "const cleanHtml = DOMPurify.sanitize(rawHtml);",
        "<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />",
        "<div dangerouslySetInnerHTML={{ __html: '<strong>static</strong>' }} />",
        "<div dangerouslySetInnerHTML={{ __html: userHtml }} />"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(3);
    expect(findings.map((finding) => finding.status)).toEqual([
      "low_confidence",
      "low_confidence",
      "needs_review"
    ]);
    expect(findings.map((finding) => finding.risk)).toEqual(["low", "low", "medium"]);
    expect(findings[0].message).toContain("sanitize");
    expect(findings[2].message).toContain("sanitization");
  });

  test("collects iframe embed and object external content candidates", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/embed.tsx",
      [
        "<iframe src=\"https://example.com\" />",
        "<embed src=\"https://example.com/file.pdf\" />",
        "<object data=\"https://example.com/file.pdf\" />"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings.map((finding) => finding.category)).toEqual([
      "embedding",
      "embedding",
      "embedding"
    ]);
  });

  test("collects postMessage wildcard target origin candidates", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/message.ts", "window.parent.postMessage({ type: 'ready' }, '*');\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "cross-window-messaging",
      risk: "medium",
      status: "needs_review"
    });
    expect(findings[0].message).toContain("targetOrigin");
  });

  test("collects message event listener candidates for origin allowlist review", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/message.ts", "window.addEventListener('message', (event) => handle(event.data));\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "cross-window-messaging",
      risk: "medium",
      status: "needs_review"
    });
    expect(findings[0].message).toContain("event.origin");
  });

  test("collects additional hardcoded secret candidates", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/secrets.ts",
      [
        "const github = 'ghp_" + "1234567890abcdefghijklmnopqrstuvwxyz';",
        "const githubPat = 'github_pat_" + "1234567890abcdefghijklmnopqrstuvwxyz';",
        "const stripeSecret = 'sk_" + "live_1234567890abcdefghijklmnopqrstuvwxyz';",
        "const stripePublic = 'pk_" + "live_1234567890abcdefghijklmnopqrstuvwxyz';",
        "const google = 'AI" + "za1234567890abcdefghijklmnopqrstuvwxyz1234';",
        "const privateKey = '-----BEGIN PRIVATE KEY-----';"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(6);
    expect(findings.every((finding) => finding.category === "secret")).toBe(true);
    expect(findings.every((finding) => finding.risk === "high")).toBe(true);
  });

  test("raises unsanitized html sink when external input signals appear in the same file", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/Page.tsx",
      [
        "const params = useSearchParams();",
        "const html = params.get('content') || '';",
        "<div dangerouslySetInnerHTML={{ __html: html }} />"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "html-injection",
      risk: "high",
      status: "needs_review"
    });
    expect(findings[0].message).toContain("관련 신호가 같은 파일에서 함께 발견되었습니다");
    expect(findings[0].message).toContain("관련 finding: BS-0001");
  });

  test("keeps unsanitized html sink risk when no external input signal appears nearby", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/Page.tsx", "<div dangerouslySetInnerHTML={{ __html: trustedHtml }} />\n");

    const findings = await scanProject(root);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      category: "html-injection",
      risk: "medium",
      status: "needs_review"
    });
    expect(findings[0].message).not.toContain("관련 신호가 같은 파일에서 함께 발견되었습니다");
  });

  test("raises wildcard postMessage when message listener lacks origin checks in the same file", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/message.ts",
      [
        "window.parent.postMessage({ type: 'ready' }, '*');",
        "window.addEventListener('message', (event) => handle(event.data));"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings.every((finding) => finding.risk === "high")).toBe(true);
    expect(findings.every((finding) => finding.message.includes("관련 신호가 같은 파일에서 함께 발견되었습니다"))).toBe(true);
    expect(findings[0].message).toContain("관련 finding: BS-0002");
    expect(findings[1].message).toContain("관련 finding: BS-0001");
  });

  test("raises token storage when html or external embedding signals appear in the same file", async () => {
    const root = await makeProject();
    await writeProjectFile(
      root,
      "src/mixed.tsx",
      [
        "localStorage.setItem('accessToken', token);",
        "<iframe src=\"https://example.com\" />"
      ].join("\n")
    );

    const findings = await scanProject(root);

    expect(findings).toHaveLength(2);
    expect(findings[0]).toMatchObject({
      category: "browser-storage",
      risk: "high"
    });
    expect(findings[1]).toMatchObject({
      category: "embedding",
      risk: "high"
    });
    expect(findings.every((finding) => finding.message.includes("관련 신호가 같은 파일에서 함께 발견되었습니다"))).toBe(true);
  });

  test("sorts report findings by review priority and limits top recommendations", () => {
    const reportFindings: Finding[] = [
      finding("BS-0001", "low", "needs_review", "Low candidate", "low"),
      finding("BS-0002", "medium", "low_confidence", "Medium low confidence", "medium-low"),
      finding("BS-0003", "medium", "needs_review", "Medium needs review", "medium-review"),
      finding("BS-0004", "high", "needs_review", "High candidate", "high"),
      finding(
        "BS-0005",
        "medium",
        "needs_review",
        "Correlated medium",
        "관련 신호가 같은 파일에서 함께 발견되었습니다. related"
      )
    ];

    const markdown = generateReport(reportFindings, { projectRoot: "/repo", top: 2 });

    expect(markdown.indexOf("BS-0004")).toBeLessThan(markdown.indexOf("BS-0003"));
    expect(markdown.indexOf("BS-0003")).toBeLessThan(markdown.indexOf("BS-0005"));
    expect(markdown.indexOf("BS-0005")).toBeLessThan(markdown.indexOf("BS-0002"));
    expect(markdown).toContain("## 우선 검토 권장 (상위 2건)");
    const topSection = markdown.split("## 우선 검토 권장 (상위 2건)")[1]?.split("## 4.")[0] ?? "";
    expect(topSection).toContain("BS-0004");
    expect(topSection).toContain("BS-0003");
    expect(topSection).not.toContain("BS-0005");
  });
});

function finding(
  id: string,
  risk: Finding["risk"],
  status: Finding["status"],
  title: string,
  message: string
): Finding {
  return {
    id,
    ruleId: `test.${id.toLowerCase()}`,
    confidence: status === "low_confidence" ? "low" : risk === "high" ? "high" : "medium",
    category: "test",
    risk,
    status,
    title,
    message,
    recommendation: "Review this test finding in context.",
    evidence: {
      filePath: `src/${id}.ts`,
      lineNumber: 1,
      linePreview: title
    }
  };
}
