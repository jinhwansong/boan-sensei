// 현재 스캐너는 정규식/라인 기반이므로, 장기적으로 AST 기반 전환이 필요하다.
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { relative, resolve, sep } from "node:path";
import ts from "typescript";
import { DEFAULT_MODE, resolveMode } from "./modes.js";
import { SCAN_RULES, type ScanRule } from "./rules.js";
import type { BoanMode, Finding, FindingsFile, ScanProjectOptions } from "./types.js";

const execFileAsync = promisify(execFile);
const EXCLUDED_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "coverage"]);
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue"]);
const DIFF_SUPPORTED_EXTENSIONS = new Set([...SUPPORTED_EXTENSIONS, ".html"]);
const DEPENDENCY_PACKAGES = ["axios", "dompurify", "js-cookie", "vite", "next", "react"] as const;
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
const HTML_ENTRY_FILES = ["index.html"];
const CSP_FRAMEWORK_FILES = [
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
  "src/middleware.js",
  "src/middleware.ts"
];
type RegistryFetch = NonNullable<ScanProjectOptions["registryFetch"]>;
type LockfileVersion = { version: string; filePath: string };

export async function scanProject(projectRoot = process.cwd(), options: ScanProjectOptions = {}): Promise<Finding[]> {
  const root = resolve(projectRoot);
  const mode = options.mode ?? DEFAULT_MODE;
  const srcRoot = resolve(root, "src");
  const ignorePatterns = await readIgnorePatterns(root);
  const files = await collectScanFiles(root, srcRoot, ignorePatterns, Boolean(options.diff));
  const findings: Finding[] = [];

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, "utf8");
    const lines = contents.split(/\r?\n/);
    const sourceFile = createSourceFile(filePath, contents);

    lines.forEach((line, index) => {
      if (shouldSkipLine(line)) {
        return;
      }
      const scannableLine = getScannableLine(line);
      const lineStart = sourceFile?.getPositionOfLineAndCharacter(index, 0) ?? 0;

      for (const rule of SCAN_RULES) {
        if (!matchesRule(scannableLine, rule)) {
          continue;
        }
        if (rule.keyword && !isKeywordCodeSignal(sourceFile, scannableLine, lineStart, rule.keyword)) {
          continue;
        }

        findings.push({
          id: formatFindingId(findings.length + 1),
          category: rule.category,
          risk: rule.risk,
          status: getFindingStatus(scannableLine, rule),
          title: rule.title,
          message: rule.message,
          evidence: {
            filePath: toPortablePath(relative(root, filePath)),
            lineNumber: index + 1,
            linePreview: line.trim()
          }
        });
      }
    });

    findings.push(...collectFileUploadFindings(root, filePath, contents, findings.length));
  }

  findings.push(...(await collectDependencyFindings(root, findings.length, ignorePatterns, options.registryFetch)));
  findings.push(...(await collectCspFindings(root, findings.length, ignorePatterns)));

  if (options.write) {
    await writeFindingsFile(root, findings, mode);
  }

  return findings;
}

async function collectDependencyFindings(
  root: string,
  offset: number,
  ignorePatterns: string[],
  registryFetch = globalThis.fetch
): Promise<Finding[]> {
  if (isIgnoredPath("package.json", ignorePatterns)) {
    return [];
  }

  const packageJsonPath = resolve(root, "package.json");
  let packageJson;

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const findings: Finding[] = [];
  const dependencySections = [
    ["dependencies", packageJson.dependencies],
    ["devDependencies", packageJson.devDependencies]
  ] as const;

  const lockfileVersions = await collectLockfileVersions(root, ignorePatterns);

  for (const [sectionName, dependencies] of dependencySections) {
    for (const packageName of DEPENDENCY_PACKAGES) {
      const version = dependencies?.[packageName];
      if (!version) {
        continue;
      }

      findings.push({
        id: formatFindingId(offset + findings.length + 1),
        category: "dependency",
        risk: "low",
        status: "needs_review",
        title: `${packageName} 버전 확인 필요`,
        message: `${packageName} ${version} 사용이 확인되었습니다. 실제 취약 버전 여부를 단정하지 말고 버전 확인 및 업데이트 검토를 권장합니다.`,
        evidence: {
          filePath: "package.json",
          lineNumber: 1,
          linePreview: `${sectionName}.${packageName}: ${version}`
        }
      });

      const latestVersion = await fetchLatestPackageVersion(packageName, registryFetch);
      if (latestVersion && normalizeVersion(version) !== normalizeVersion(latestVersion)) {
        findings.push({
          id: formatFindingId(offset + findings.length + 1),
          category: "dependency",
          risk: "low",
          status: "needs_review",
          title: `${packageName} 최신 버전 확인 필요`,
          message: `${packageName} 현재 ${version}, 최신 ${latestVersion}입니다. 취약점 판단이 아니라 최신 버전과 차이가 있어 업데이트 검토를 권장합니다.`,
          evidence: {
            filePath: "package.json",
            lineNumber: 1,
            linePreview: `${sectionName}.${packageName}: ${version} latest ${latestVersion}`
          }
        });
      }

      const lockfileVersion = lockfileVersions.get(packageName);
      if (lockfileVersion && shouldCompareLockfileVersion(version) && normalizeVersion(version) !== normalizeVersion(lockfileVersion.version)) {
        findings.push({
          id: formatFindingId(offset + findings.length + 1),
          category: "dependency",
          risk: "low",
          status: "needs_review",
          title: `${packageName} lockfile 버전 확인 필요`,
          message: `${packageName} package.json(${version})과 lockfile(${lockfileVersion.version}) 버전 표기가 다릅니다. 설치 기준 확인을 권장합니다.`,
          evidence: {
            filePath: lockfileVersion.filePath,
            lineNumber: 1,
            linePreview: `${packageName}: package.json ${version}, lockfile ${lockfileVersion.version}`
          }
        });
      }
    }
  }

  if (!(await hasAnyLockfile(root, ignorePatterns))) {
    findings.push({
      id: formatFindingId(offset + findings.length + 1),
      category: "dependency",
      risk: "low",
      status: "needs_review",
      title: "lockfile 존재 확인 필요",
      message: "지원하는 lockfile이 확인되지 않았습니다. 의존성 재현성과 설치 기준을 위해 lockfile 존재 여부 확인을 권장합니다.",
      evidence: {
        filePath: ".",
        lineNumber: 1,
        linePreview: "package-lock.json, pnpm-lock.yaml, yarn.lock not found"
      }
    });
  }

  return findings;
}

async function collectCspFindings(root: string, offset: number, ignorePatterns: string[]): Promise<Finding[]> {
  const htmlFiles = await collectHtmlEntryFiles(root, ignorePatterns);
  const frameworkFiles = await collectExistingFiles(root, CSP_FRAMEWORK_FILES, ignorePatterns);
  const frameworkPolicies = await collectCspPolicyFindings(root, frameworkFiles, offset);
  const findings: Finding[] = [];
  const hasFrameworkCsp = frameworkPolicies.hasCsp;

  for (const filePath of htmlFiles.sort()) {
    const contents = await readFile(filePath, "utf8");
    const relativePath = toPortablePath(relative(root, filePath));
    const cspIndex = contents.search(/Content-Security-Policy/i);

    if (cspIndex === -1 && !hasFrameworkCsp) {
      findings.push({
        id: formatFindingId(offset + findings.length + 1),
        category: "csp",
        risk: "low",
        status: "needs_review",
        title: "CSP 정책 확인 필요",
        message: "정적 HTML 엔트리에서 Content-Security-Policy 문자열이 확인되지 않았습니다. 런타임 헤더 설정 여부는 별도 확인이 필요합니다.",
        evidence: {
          filePath: relativePath,
          lineNumber: 1,
          linePreview: "Content-Security-Policy not found in static HTML"
        }
      });
      continue;
    }

    const unsafeMatch = contents.match(/'unsafe-(?:inline|eval)'/i);
    if (unsafeMatch?.index !== undefined) {
      findings.push({
        id: formatFindingId(offset + findings.length + 1),
        category: "csp",
        risk: "medium",
        status: "needs_review",
        title: "CSP unsafe directive 확인 필요",
        message: "CSP에 unsafe directive 후보가 포함되어 있습니다. 실제 영향은 단정하지 말고 필요한 예외인지 검토를 권장합니다.",
        evidence: {
          filePath: relativePath,
          lineNumber: getLineNumber(contents, unsafeMatch.index),
          linePreview: getLinePreview(contents, unsafeMatch.index)
        }
      });
    }
  }

  findings.push(...frameworkPolicies.findings.map((finding, index) => ({
    ...finding,
    id: formatFindingId(offset + findings.length + index + 1)
  })));

  return findings;
}

async function collectCspPolicyFindings(
  root: string,
  filePaths: string[],
  offset: number
): Promise<{ hasCsp: boolean; findings: Finding[] }> {
  const findings: Finding[] = [];
  let hasCsp = false;

  for (const filePath of filePaths.sort()) {
    const contents = await readFile(filePath, "utf8");
    const cspIndex = contents.search(/Content-Security-Policy/i);
    if (cspIndex === -1) {
      continue;
    }
    hasCsp = true;

    const unsafeMatch = contents.match(/'unsafe-(?:inline|eval)'/i);
    if (unsafeMatch?.index === undefined) {
      continue;
    }

    findings.push({
      id: formatFindingId(offset + findings.length + 1),
      category: "csp",
      risk: "medium",
      status: "needs_review",
      title: "CSP unsafe directive 확인 필요",
      message: "프레임워크 header 설정의 CSP에 unsafe directive 후보가 포함되어 있습니다. 실제 영향은 단정하지 말고 필요한 예외인지 검토를 권장합니다.",
      evidence: {
        filePath: toPortablePath(relative(root, filePath)),
        lineNumber: getLineNumber(contents, unsafeMatch.index),
        linePreview: getLinePreview(contents, unsafeMatch.index)
      }
    });
  }

  return { hasCsp, findings };
}

async function hasAnyLockfile(root: string, ignorePatterns: string[]): Promise<boolean> {
  for (const lockfile of LOCKFILES) {
    if (isIgnoredPath(lockfile, ignorePatterns)) {
      continue;
    }
    try {
      await access(resolve(root, lockfile));
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }
  return false;
}

async function collectLockfileVersions(root: string, ignorePatterns: string[]): Promise<Map<string, LockfileVersion>> {
  const versions = new Map<string, LockfileVersion>();
  await readPackageLockVersions(root, ignorePatterns, versions);
  await readPnpmLockVersions(root, ignorePatterns, versions);
  await readYarnLockVersions(root, ignorePatterns, versions);
  return versions;
}

async function readPackageLockVersions(
  root: string,
  ignorePatterns: string[],
  versions: Map<string, LockfileVersion>
): Promise<void> {
  const filePath = "package-lock.json";
  if (isIgnoredPath(filePath, ignorePatterns)) {
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolve(root, filePath), "utf8")) as {
      packages?: Record<string, { version?: string }>;
      dependencies?: Record<string, { version?: string }>;
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return;
    }
    throw error;
  }

  for (const packageName of DEPENDENCY_PACKAGES) {
    const version = parsed.packages?.[`node_modules/${packageName}`]?.version ?? parsed.dependencies?.[packageName]?.version;
    if (version && !versions.has(packageName)) {
      versions.set(packageName, { version, filePath });
    }
  }
}

async function readPnpmLockVersions(
  root: string,
  ignorePatterns: string[],
  versions: Map<string, LockfileVersion>
): Promise<void> {
  const filePath = "pnpm-lock.yaml";
  if (isIgnoredPath(filePath, ignorePatterns)) {
    return;
  }

  let contents;
  try {
    contents = await readFile(resolve(root, filePath), "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return;
    }
    throw error;
  }

  const parsedVersions = parsePnpmLockVersions(contents);
  setTrackedLockfileVersions(filePath, parsedVersions, versions);
}

async function readYarnLockVersions(
  root: string,
  ignorePatterns: string[],
  versions: Map<string, LockfileVersion>
): Promise<void> {
  const filePath = "yarn.lock";
  if (isIgnoredPath(filePath, ignorePatterns)) {
    return;
  }

  let contents;
  try {
    contents = await readFile(resolve(root, filePath), "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return;
    }
    throw error;
  }

  const parsedVersions = parseYarnLockVersions(contents);
  setTrackedLockfileVersions(filePath, parsedVersions, versions);
}

function setTrackedLockfileVersions(
  filePath: string,
  parsedVersions: Map<string, string>,
  versions: Map<string, LockfileVersion>
): void {
  for (const packageName of DEPENDENCY_PACKAGES) {
    const version = parsedVersions.get(packageName);
    if (version && !versions.has(packageName)) {
      versions.set(packageName, { version, filePath });
    }
  }
}

function parsePnpmLockVersions(contents: string): Map<string, string> {
  const versions = new Map<string, string>();
  const lines = contents.split(/\r?\n/);
  let inPackages = false;

  for (const line of lines) {
    if (/^\S/.test(line)) {
      inPackages = line.trim() === "packages:";
      continue;
    }
    if (!inPackages) {
      continue;
    }

    const keyMatch = line.match(/^\s{2}['"]?(?:\/)?((?:@[^/]+\/)?[^@/'"]+)@([^:'"]+)/);
    if (keyMatch && !versions.has(keyMatch[1])) {
      versions.set(keyMatch[1], keyMatch[2]);
    }
  }

  return versions;
}

function parseYarnLockVersions(contents: string): Map<string, string> {
  const versions = new Map<string, string>();
  const lines = contents.split(/\r?\n/);
  let currentPackages: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }

    if (!line.startsWith(" ")) {
      currentPackages = line
        .replace(/:$/, "")
        .split(/,\s*/)
        .map((key) => key.trim().replace(/^["']|["']$/g, ""))
        .map(getPackageNameFromYarnKey)
        .filter((packageName): packageName is string => Boolean(packageName));
      continue;
    }

    const versionMatch = line.match(/^\s+version\s+["']?([^"'\s]+)["']?/);
    if (!versionMatch) {
      continue;
    }

    for (const packageName of currentPackages) {
      if (!versions.has(packageName)) {
        versions.set(packageName, versionMatch[1]);
      }
    }
  }

  return versions;
}

function getPackageNameFromYarnKey(key: string): string | undefined {
  const withoutProtocol = key.replace(/^npm:/, "");
  if (withoutProtocol.startsWith("@")) {
    const match = withoutProtocol.match(/^(@[^/]+\/[^@]+)@/);
    return match?.[1];
  }
  const match = withoutProtocol.match(/^([^@]+)@/);
  return match?.[1];
}

async function fetchLatestPackageVersion(packageName: string, registryFetch?: RegistryFetch): Promise<string | undefined> {
  if (!registryFetch) {
    return undefined;
  }

  try {
    const response = await registryFetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}`);
    if (!response.ok) {
      return undefined;
    }
    const body = (await response.json()) as { "dist-tags"?: { latest?: string } };
    return body["dist-tags"]?.latest;
  } catch {
    return undefined;
  }
}

function normalizeVersion(version: string): string {
  return version.replace(/^[~^<>=\s]+/, "").trim();
}

function shouldCompareLockfileVersion(version: string): boolean {
  return !/^(?:workspace:|npm:|file:|link:|git:|[~^*<>=])/.test(version.trim()) && !/[xX*]|\|\|/.test(version);
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || /^\/\*.*\*\/$/.test(trimmed);
}

function getScannableLine(line: string): string {
  const commentIndex = findLineCommentIndex(line);
  return commentIndex === -1 ? line : line.slice(0, commentIndex);
}

function findLineCommentIndex(line: string): number {
  let quote: string | undefined;
  let escaped = false;

  for (let index = 0; index < line.length - 1; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (quote) {
      if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = undefined;
      }
      continue;
    }

    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === "/" && nextChar === "/" && line[index - 1] !== ":") {
      return index;
    }
  }

  return -1;
}

function getFindingStatus(line: string, rule: ScanRule): Finding["status"] {
  if (rule.status) {
    return rule.status;
  }

  if (!rule.keyword) {
    return "needs_review";
  }

  if (
    rule.keyword.includes("\"") ||
    stripStringLiteralContents(line).includes(rule.keyword) ||
    looksLikeFunctionCall(line, rule.keyword)
  ) {
    return "needs_review";
  }

  return "low_confidence";
}

function looksLikeFunctionCall(line: string, keyword: string): boolean {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escapedKeyword}\\s*\\(`).test(line);
}

function stripStringLiteralContents(line: string): string {
  return line.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, (match) => {
    const quote = match[0];
    return `${quote}${quote}`;
  });
}

function matchesRule(line: string, rule: ScanRule): boolean {
  if (rule.keyword && line.includes(rule.keyword)) {
    return true;
  }
  return rule.pattern ? rule.pattern.test(line) : false;
}

function createSourceFile(filePath: string, contents: string): ts.SourceFile | undefined {
  if (filePath.endsWith(".vue")) {
    return undefined;
  }

  return ts.createSourceFile(filePath, contents, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
}

function getScriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) {
    return ts.ScriptKind.TSX;
  }
  if (filePath.endsWith(".jsx")) {
    return ts.ScriptKind.JSX;
  }
  if (filePath.endsWith(".ts")) {
    return ts.ScriptKind.TS;
  }
  if (filePath.endsWith(".js")) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.Unknown;
}

function isKeywordCodeSignal(
  sourceFile: ts.SourceFile | undefined,
  line: string,
  lineStart: number,
  keyword: string
): boolean {
  if (!sourceFile || keyword.includes("\"")) {
    return true;
  }

  let index = line.indexOf(keyword);
  while (index !== -1) {
    if (isCodePosition(sourceFile, lineStart + index)) {
      return true;
    }
    index = line.indexOf(keyword, index + keyword.length);
  }

  return false;
}

function isCodePosition(sourceFile: ts.SourceFile, position: number): boolean {
  const node = findSmallestNodeAtPosition(sourceFile, position);
  if (!node) {
    return true;
  }

  return !isStringLikeNode(node);
}

function findSmallestNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Node | undefined {
  let best: ts.Node | undefined;

  function visit(node: ts.Node) {
    if (position < node.getFullStart() || position >= node.getEnd()) {
      return;
    }
    best = node;
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return best;
}

function isStringLikeNode(node: ts.Node): boolean {
  return (
    ts.isStringLiteralLike(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    node.kind === ts.SyntaxKind.TemplateHead ||
    node.kind === ts.SyntaxKind.TemplateMiddle ||
    node.kind === ts.SyntaxKind.TemplateTail ||
    node.kind === ts.SyntaxKind.JsxText
  );
}

function collectFileUploadFindings(root: string, filePath: string, contents: string, offset: number): Finding[] {
  const findings: Finding[] = [];
  const inputPattern = /<input\b[\s\S]*?>/gi;
  let match: RegExpExecArray | null;

  while ((match = inputPattern.exec(contents)) !== null) {
    const tag = match[0];
    if (!/\btype\s*=\s*["']file["']/i.test(tag) || /\baccept\s*=/i.test(tag)) {
      continue;
    }

    findings.push({
      id: formatFindingId(offset + findings.length + 1),
      category: "file-upload",
      risk: "low",
      status: "low_confidence",
      title: "파일 업로드 accept 속성 확인 필요",
      message: "파일 업로드 입력에서 accept 속성 확인이 필요한 낮은 신뢰도 점검 후보입니다.",
      evidence: {
        filePath: toPortablePath(relative(root, filePath)),
        lineNumber: getLineNumber(contents, match.index),
        linePreview: getLinePreview(contents, match.index)
      }
    });
  }

  findings.push(...collectFileUploadWrapperFindings(root, filePath, contents, offset + findings.length));

  return findings;
}

function collectFileUploadWrapperFindings(root: string, filePath: string, contents: string, offset: number): Finding[] {
  if (!/\.[jt]sx$/.test(filePath)) {
    return [];
  }

  const uploadComponents = collectUploadComponentNames(contents);
  if (uploadComponents.size === 0) {
    return [];
  }

  const findings: Finding[] = [];

  for (const componentName of uploadComponents) {
    const usagePattern = new RegExp(`<${componentName}\\b([^>]*)\\/?>`, "g");
    let usage: RegExpExecArray | null;

    while ((usage = usagePattern.exec(contents)) !== null) {
      const tag = usage[0];
      if (tag.includes("function ") || /\baccept\s*=/.test(tag)) {
        continue;
      }

      findings.push({
        id: formatFindingId(offset + findings.length + 1),
        category: "file-upload",
        risk: "low",
        status: "low_confidence",
        title: "파일 업로드 accept prop 확인 필요",
        message: `${componentName} 파일 업로드 래퍼 사용부에서 accept prop 확인이 필요한 낮은 신뢰도 점검 후보입니다.`,
        evidence: {
          filePath: toPortablePath(relative(root, filePath)),
          lineNumber: getLineNumber(contents, usage.index),
          linePreview: getLinePreview(contents, usage.index)
        }
      });
    }
  }

  return findings;
}

function collectUploadComponentNames(contents: string): Set<string> {
  const componentNames = new Set<string>();
  const functionPattern = /function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
  let match: RegExpExecArray | null;

  while ((match = functionPattern.exec(contents)) !== null) {
    const body = match[0];
    if (/<input\b[\s\S]*?\btype\s*=\s*["']file["'][\s\S]*?\baccept\s*=/i.test(body)) {
      componentNames.add(match[1]);
    }
  }

  return componentNames;
}

export async function writeFindingsFile(
  projectRoot: string,
  findings: Finding[],
  modeInput: BoanMode | string | undefined = DEFAULT_MODE
): Promise<FindingsFile> {
  const mode = resolveMode(modeInput);
  const output: FindingsFile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projectRoot: resolve(projectRoot),
    mode,
    findings
  };
  const outputDir = resolve(projectRoot, ".boan-sensei");
  const findingsPath = resolve(outputDir, "findings.json");
  let previousFindings: Finding[] | undefined;

  await mkdir(outputDir, { recursive: true });

  try {
    const previousContents = await readFile(findingsPath, "utf8");
    previousFindings = (JSON.parse(previousContents) as FindingsFile).findings;
    await writeFile(resolve(outputDir, "findings.prev.json"), previousContents, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw error;
    }
  }

  await writeFile(findingsPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  if (previousFindings) {
    const previousKeys = new Set(previousFindings.map(getFindingComparisonKey));
    const currentKeys = new Set(findings.map(getFindingComparisonKey));
    const newCount = [...currentKeys].filter((key) => !previousKeys.has(key)).length;
    const resolvedCount = [...previousKeys].filter((key) => !currentKeys.has(key)).length;
    console.log(`boan-sensei: findings diff +${newCount} new, -${resolvedCount} resolved`);
  }

  return output;
}

async function collectScanFiles(root: string, srcRoot: string, ignorePatterns: string[], diffOnly: boolean): Promise<string[]> {
  if (!diffOnly) {
    return collectFiles(root, srcRoot, ignorePatterns);
  }

  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", "--diff-filter=ACMRT"], { cwd: root });
    const files = stdout
      .split(/\r?\n/)
      .map((filePath) => filePath.trim())
      .filter(Boolean)
      .filter((filePath) => DIFF_SUPPORTED_EXTENSIONS.has(getExtension(filePath)))
      .filter((filePath) => !isIgnoredPath(toPortablePath(filePath), ignorePatterns))
      .map((filePath) => resolve(root, filePath));

    return files;
  } catch {
    console.warn("boan-sensei: git diff 파일 목록을 확인할 수 없어 전체 스캔으로 fallback합니다.");
    return collectFiles(root, srcRoot, ignorePatterns);
  }
}

async function collectHtmlEntryFiles(root: string, ignorePatterns: string[]): Promise<string[]> {
  const files: string[] = [];

  files.push(...(await collectExistingFiles(root, HTML_ENTRY_FILES, ignorePatterns)));
  files.push(...(await collectFilesByExtension(root, resolve(root, "public"), ".html", ignorePatterns)));
  return files;
}

async function collectExistingFiles(root: string, filePaths: string[], ignorePatterns: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const filePath of filePaths) {
    if (isIgnoredPath(filePath, ignorePatterns)) {
      continue;
    }
    try {
      await access(resolve(root, filePath));
      files.push(resolve(root, filePath));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  return files;
}

async function collectFilesByExtension(
  root: string,
  dir: string,
  extension: string,
  ignorePatterns: string[]
): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    const relativePath = toPortablePath(relative(root, fullPath));

    if (isIgnoredPath(relativePath, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...(await collectFilesByExtension(root, fullPath, extension, ignorePatterns)));
      }
      continue;
    }

    if (entry.isFile() && getExtension(entry.name) === extension) {
      files.push(fullPath);
    }
  }

  return files;
}

async function collectFiles(root: string, dir: string, ignorePatterns: string[]): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    const relativePath = toPortablePath(relative(root, fullPath));

    if (isIgnoredPath(relativePath, ignorePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...(await collectFiles(root, fullPath, ignorePatterns)));
      }
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(getExtension(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function readIgnorePatterns(root: string): Promise<string[]> {
  try {
    const contents = await readFile(resolve(root, ".boan-senseiignore"), "utf8");
    return contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function isIgnoredPath(filePath: string, patterns: string[]): boolean {
  const portablePath = toPortablePath(filePath);
  return patterns.some((pattern) => {
    const portablePattern = toPortablePath(pattern);
    if (portablePattern.endsWith("/")) {
      return portablePath.startsWith(portablePattern);
    }
    if (portablePattern.includes("*")) {
      const regex = new RegExp(`^${portablePattern.split("*").map(escapeRegex).join(".*")}$`);
      return regex.test(portablePath) || regex.test(portablePath.split("/").at(-1) ?? portablePath);
    }
    return portablePath === portablePattern || portablePath.startsWith(`${portablePattern}/`);
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getFindingComparisonKey(finding: Finding): string {
  return [
    finding.category,
    finding.title,
    finding.message,
    finding.evidence.filePath,
    finding.evidence.lineNumber
  ].join("|");
}

function getLineNumber(contents: string, index: number): number {
  return contents.slice(0, index).split(/\r?\n/).length;
}

function getLinePreview(contents: string, index: number): string {
  const before = contents.slice(0, index);
  const lineStart = Math.max(before.lastIndexOf("\n") + 1, 0);
  const lineEndIndex = contents.indexOf("\n", index);
  const lineEnd = lineEndIndex === -1 ? contents.length : lineEndIndex;
  return contents.slice(lineStart, lineEnd).trim();
}

function getExtension(fileName: string): string {
  const match = fileName.match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function formatFindingId(value: number): string {
  return `BS-${String(value).padStart(4, "0")}`;
}

function toPortablePath(filePath: string): string {
  return filePath.split(sep).join("/");
}
