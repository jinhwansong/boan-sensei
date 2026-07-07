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
const DEFAULT_SCAN_DIRS = ["src", "app", "pages", "components"];
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
type FindingCandidate = Omit<Finding, "ruleId" | "confidence" | "recommendation"> &
  Partial<Pick<Finding, "ruleId" | "confidence" | "recommendation">>;

export async function scanProject(projectRoot = process.cwd(), options: ScanProjectOptions = {}): Promise<Finding[]> {
  const root = resolve(projectRoot);
  const mode = options.mode ?? DEFAULT_MODE;
  const ignorePatterns = await readIgnorePatterns(root);
  const scanRoots = await collectDefaultScanRoots(root, ignorePatterns);
  const files = await collectScanFiles(root, scanRoots, ignorePatterns, Boolean(options.diff));
  const findings: Finding[] = [];

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, "utf8");
    const lines = contents.split(/\r?\n/);
    const sourceFile = createSourceFile(filePath, contents);
    let inBlockComment = false;

    for (const [index, line] of lines.entries()) {
      const commentState = getLineCommentState(line, inBlockComment);
      inBlockComment = commentState.inBlockComment;
      if (!commentState.scannable) {
        continue;
      }
      const scannableLine = getScannableLine(commentState.scannable);
      const lineStart = sourceFile?.getPositionOfLineAndCharacter(index, 0) ?? 0;

      for (const rule of SCAN_RULES) {
        if (!matchesRule(scannableLine, rule)) {
          continue;
        }
        if (rule.keyword && !isKeywordCodeSignal(sourceFile, scannableLine, lineStart, rule.keyword)) {
          continue;
        }
        if (shouldSkipStringOnlyMatch(sourceFile, scannableLine, rule)) {
          continue;
        }
        if (shouldSkipRuleMatch(scannableLine, rule)) {
          continue;
        }

        findings.push(completeFinding({
          id: formatFindingId(findings.length + 1),
          category: rule.category,
          risk: getFindingRisk(scannableLine, rule, lines, index),
          status: getFindingStatus(scannableLine, rule, lines, index),
          title: rule.title,
          message: getFindingMessage(scannableLine, rule, lines, index),
          evidence: {
            filePath: toPortablePath(relative(root, filePath)),
            lineNumber: index + 1,
            linePreview: line.trim()
          }
        }, rule));
      }
    }

    findings.push(...collectFileUploadFindings(root, filePath, contents, findings.length));
    applyFileCorrelations(findings, toPortablePath(relative(root, filePath)), contents);
  }

  findings.push(...(await collectDependencyFindings(
    root,
    findings.length,
    ignorePatterns,
    options.checkLatest ? options.registryFetch ?? globalThis.fetch : undefined
  )));
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
  registryFetch?: RegistryFetch
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

      findings.push(completeFinding({
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
      }));

      const latestVersion = await fetchLatestPackageVersion(packageName, registryFetch);
      if (latestVersion && normalizeVersion(version) !== normalizeVersion(latestVersion)) {
        findings.push(completeFinding({
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
        }));
      }

      const lockfileVersion = lockfileVersions.get(packageName);
      if (lockfileVersion && shouldCompareLockfileVersion(version) && normalizeVersion(version) !== normalizeVersion(lockfileVersion.version)) {
        findings.push(completeFinding({
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
        }));
      }
    }
  }

  if (!(await hasAnyLockfile(root, ignorePatterns))) {
    findings.push(completeFinding({
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
    }));
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
      findings.push(completeFinding({
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
      }));
      continue;
    }

    const unsafeMatch = contents.match(/'unsafe-(?:inline|eval)'/i);
    if (unsafeMatch?.index !== undefined) {
      findings.push(completeFinding({
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
      }));
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

    findings.push(completeFinding({
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
    }));
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

function completeFinding(finding: FindingCandidate, rule?: ScanRule): Finding {
  return {
    ...finding,
    ruleId: finding.ruleId ?? rule?.ruleId ?? getDefaultRuleId(finding, rule),
    confidence: finding.confidence ?? rule?.confidence ?? getDefaultConfidence(finding),
    recommendation: finding.recommendation ?? rule?.recommendation ?? getDefaultRecommendation(finding)
  };
}

function getDefaultRuleId(finding: FindingCandidate, rule?: ScanRule): string {
  if (rule?.keyword === "localStorage") {
    return "browser-storage.local-storage";
  }
  if (rule?.keyword === "sessionStorage") {
    return "browser-storage.session-storage";
  }
  if (rule?.keyword === "dangerouslySetInnerHTML") {
    return "html-injection.dangerously-set-inner-html";
  }
  const titleSlug = finding.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return titleSlug ? `${finding.category}.${titleSlug}` : `${finding.category}.review-candidate`;
}

function getDefaultConfidence(finding: FindingCandidate): Finding["confidence"] {
  if (finding.status === "low_confidence") {
    return "low";
  }
  if (finding.risk === "high") {
    return "high";
  }
  return "medium";
}

function getDefaultRecommendation(finding: FindingCandidate): string {
  if (finding.category === "dependency") {
    return "Verify the package version and lockfile state; consider an update when it fits the project constraints.";
  }
  if (finding.category === "secret") {
    return "Verify whether the value is an actual secret and move it to managed configuration if needed.";
  }
  if (finding.category === "browser-storage") {
    return "Verify whether browser storage contains authentication, token, or personal data and whether a safer storage flow is needed.";
  }
  if (finding.category === "navigation") {
    return "Verify whether new-window links include noopener and noreferrer where appropriate.";
  }
  if (finding.category === "html-injection") {
    return "Verify the HTML input source and sanitization path.";
  }
  return "Review this code signal in project context and decide whether a change is recommended.";
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

function getLineCommentState(line: string, inBlockComment: boolean): { scannable: string; inBlockComment: boolean } {
  let remaining = line;
  let stillInBlockComment = inBlockComment;
  let scannable = "";

  while (remaining.length > 0) {
    if (stillInBlockComment) {
      const endIndex = remaining.indexOf("*/");
      if (endIndex === -1) {
        return { scannable, inBlockComment: true };
      }
      remaining = remaining.slice(endIndex + 2);
      stillInBlockComment = false;
      continue;
    }

    const blockStart = remaining.indexOf("/*");
    if (blockStart === -1) {
      scannable += remaining;
      break;
    }

    scannable += remaining.slice(0, blockStart);
    const blockEnd = remaining.indexOf("*/", blockStart + 2);
    if (blockEnd === -1) {
      stillInBlockComment = true;
      break;
    }
    remaining = remaining.slice(blockEnd + 2);
  }

  if (shouldSkipLine(scannable)) {
    return { scannable: "", inBlockComment: stillInBlockComment };
  }

  return { scannable, inBlockComment: stillInBlockComment };
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

function getFindingRisk(line: string, rule: ScanRule, lines: string[] = [], lineIndex = 0): Finding["risk"] {
  if (isPublicEnvRule(rule)) {
    return hasSensitivePublicEnvName(line) ? "medium" : "low";
  }
  if (isConsoleRule(rule)) {
    return hasSensitiveLogIdentifier(line) ? "medium" : "low";
  }
  if (isStorageRule(rule)) {
    return hasStorageAuthIdentifier(line) ? "medium" : "low";
  }
  if (isDangerouslySetInnerHtmlRule(rule)) {
    return hasLiteralDangerousHtmlValue(line) || hasNearbySanitizeSignal(line, lines, lineIndex) ? "low" : rule.risk;
  }
  return rule.risk;
}

function getFindingStatus(
  line: string,
  rule: ScanRule,
  lines: string[] = [],
  lineIndex = 0
): Finding["status"] {
  if (rule.status) {
    return rule.status;
  }

  if (isPublicEnvRule(rule)) {
    return hasSensitivePublicEnvName(line) ? "needs_review" : "low_confidence";
  }
  if (isConsoleRule(rule)) {
    return hasSensitiveLogIdentifier(line) ? "needs_review" : "low_confidence";
  }
  if (isStorageRule(rule)) {
    return hasStorageAuthIdentifier(line) ? "needs_review" : "low_confidence";
  }
  if (isDangerouslySetInnerHtmlRule(rule)) {
    if (hasLiteralDangerousHtmlValue(line) || hasNearbySanitizeSignal(line, lines, lineIndex)) {
      return "low_confidence";
    }
    return "needs_review";
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

function getFindingMessage(line: string, rule: ScanRule, lines: string[], lineIndex: number): string {
  if (isConsoleRule(rule)) {
    return hasSensitiveLogIdentifier(line)
      ? "Console output candidate. Verify whether token, password, email, auth, or secret-like data can be logged in production."
      : "Console output candidate with no obvious sensitive identifier on the same line. Review if it should remain in production code.";
  }
  if (isDangerouslySetInnerHtmlRule(rule)) {
    if (hasNearbySanitizeSignal(line, lines, lineIndex)) {
      return "HTML injection sink candidate. A sanitize flow was detected nearby, but verify input source and sanitization path.";
    }
    return "HTML injection sink candidate. Verify input source and sanitization path.";
  }
  if (rule.category === "cross-window-messaging") {
    return "postMessage usage candidate. Verify targetOrigin and event.origin allowlist. 확인이 필요합니다.";
  }
  return rule.message;
}

function applyFileCorrelations(findings: Finding[], filePath: string, contents: string): void {
  const fileFindings = findings.filter((finding) => finding.evidence.filePath === filePath);
  if (fileFindings.length === 0) {
    return;
  }

  const htmlSinks = fileFindings.filter(isUnsanitizedDangerousHtmlFinding);
  if (htmlSinks.length > 0 && hasExternalInputSignal(contents)) {
    for (const finding of htmlSinks) {
      raiseCorrelatedFinding(finding, finding.id);
    }
  }

  const wildcardPostMessages = fileFindings.filter(isWildcardPostMessageFinding);
  const messageListeners = fileFindings.filter(isMessageListenerFinding);
  if (wildcardPostMessages.length > 0 && messageListeners.length > 0 && !hasMessageOriginCheck(contents)) {
    for (const finding of wildcardPostMessages) {
      raiseCorrelatedFinding(finding, messageListeners[0].id);
    }
    for (const finding of messageListeners) {
      raiseCorrelatedFinding(finding, wildcardPostMessages[0].id);
    }
  }

  const tokenStorageFindings = fileFindings.filter(isTokenStorageFinding);
  const xssOrEmbeddingFindings = fileFindings.filter(isHtmlOrEmbeddingFinding);
  if (tokenStorageFindings.length > 0 && xssOrEmbeddingFindings.length > 0) {
    for (const finding of tokenStorageFindings) {
      raiseCorrelatedFinding(finding, xssOrEmbeddingFindings[0].id);
    }
    for (const finding of xssOrEmbeddingFindings) {
      raiseCorrelatedFinding(finding, tokenStorageFindings[0].id);
    }
  }
}

function isUnsanitizedDangerousHtmlFinding(finding: Finding): boolean {
  return (
    finding.category === "html-injection" &&
    finding.evidence.linePreview.includes("dangerouslySetInnerHTML") &&
    finding.status === "needs_review"
  );
}

function hasExternalInputSignal(contents: string): boolean {
  return /\b(?:useParams|useSearchParams)\b|req\.(?:query|body)\b|\b[A-Za-z_$][\w$]*\.data\b/.test(contents);
}

function isWildcardPostMessageFinding(finding: Finding): boolean {
  return (
    finding.category === "cross-window-messaging" &&
    /postMessage\s*\([\s\S]*,\s*["'`]\*["'`]|targetOrigin\s*:\s*["'`]\*["'`]/.test(finding.evidence.linePreview)
  );
}

function isMessageListenerFinding(finding: Finding): boolean {
  return finding.category === "cross-window-messaging" && /addEventListener\s*\(\s*["']message["']/.test(finding.evidence.linePreview);
}

function hasMessageOriginCheck(contents: string): boolean {
  return /\bevent\.origin\b|\.origin\s*(?:===|!==|==|!=)|allowedOrigins?|originAllowlist|allowlist/i.test(contents);
}

function isTokenStorageFinding(finding: Finding): boolean {
  return finding.category === "browser-storage" && hasStorageAuthIdentifier(finding.evidence.linePreview);
}

function isHtmlOrEmbeddingFinding(finding: Finding): boolean {
  return finding.category === "html-injection" || finding.category === "embedding";
}

function raiseCorrelatedFinding(finding: Finding, relatedFindingId: string): void {
  finding.risk = raiseRisk(finding.risk);
  if (!finding.message.includes("관련 신호가 같은 파일에서 함께 발견되었습니다")) {
    finding.message = `${finding.message} 관련 신호가 같은 파일에서 함께 발견되었습니다. 관련 finding: ${relatedFindingId}.`;
  }
}

function raiseRisk(risk: Finding["risk"]): Finding["risk"] {
  if (risk === "low") {
    return "medium";
  }
  if (risk === "medium") {
    return "high";
  }
  return "high";
}

function shouldSkipRuleMatch(line: string, rule: ScanRule): boolean {
  return isTargetBlankRule(rule) && hasNoopenerAndNoreferrer(line);
}

function shouldSkipStringOnlyMatch(sourceFile: ts.SourceFile | undefined, line: string, rule: ScanRule): boolean {
  if (sourceFile || !rule.keyword || rule.keyword.includes("\"") || isTargetBlankRule(rule)) {
    return false;
  }
  if (looksLikeFunctionCall(line, rule.keyword)) {
    return false;
  }
  return !stripStringLiteralContents(line).includes(rule.keyword);
}

function isPublicEnvRule(rule: ScanRule): boolean {
  return rule.category === "public-env";
}

function isConsoleRule(rule: ScanRule): boolean {
  return rule.category === "debug-output";
}

function isStorageRule(rule: ScanRule): boolean {
  return rule.category === "browser-storage";
}

function isDangerouslySetInnerHtmlRule(rule: ScanRule): boolean {
  return rule.category === "html-injection" && rule.keyword === "dangerouslySetInnerHTML";
}

function isTargetBlankRule(rule: ScanRule): boolean {
  return rule.category === "navigation" && rule.title.includes("target=");
}

function hasSensitivePublicEnvName(line: string): boolean {
  const sensitiveNamePattern = /\b[A-Z0-9_$]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|PRIVATE)[A-Z0-9_$]*\b/i;
  if (/\b(?:NEXT_PUBLIC_|VITE_)[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL|PRIVATE)[A-Z0-9_]*\b/i.test(line)) {
    return true;
  }
  const assignmentTarget = line.split(/\b(?:import\.meta\.env|process\.env)\b/)[0] ?? "";
  return sensitiveNamePattern.test(assignmentTarget);
}

function hasSensitiveLogIdentifier(line: string): boolean {
  return /(?:token|password|email|auth|secret)/i.test(line);
}

function hasStorageAuthIdentifier(line: string): boolean {
  return /\b(?:token|access|refresh|jwt|authorization|bearer|auth)\b/i.test(line);
}

function hasLiteralDangerousHtmlValue(line: string): boolean {
  return /__html\s*:\s*(?:"[^"]*"|'[^']*'|`[^`]*`)/.test(line);
}

function hasNearbySanitizeSignal(line: string, lines: string[], lineIndex: number): boolean {
  const htmlValue = getDangerousHtmlIdentifier(line);
  const start = Math.max(0, lineIndex - 10);
  const nearbyLines = lines.slice(start, lineIndex + 1).map(getScannableLine);
  return nearbyLines.some((nearbyLine) => {
    if (!/\b(?:DOMPurify|sanitize|purify)\b/i.test(nearbyLine)) {
      return false;
    }
    return htmlValue ? new RegExp(`\\b${escapeRegex(htmlValue)}\\b`).test(nearbyLine) : true;
  });
}

function getDangerousHtmlIdentifier(line: string): string | undefined {
  const match = line.match(/__html\s*:\s*([A-Za-z_$][\w$]*)/);
  return match?.[1];
}

function hasNoopenerAndNoreferrer(line: string): boolean {
  const relMatch = line.match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|{["']([^"']*)["']})/i);
  const relValue = relMatch?.[1] ?? relMatch?.[2] ?? relMatch?.[3] ?? "";
  return /\bnoopener\b/i.test(relValue) && /\bnoreferrer\b/i.test(relValue);
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

    findings.push(completeFinding({
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
    }));
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

      findings.push(completeFinding({
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
      }));
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
    schemaVersion: 2,
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

async function collectDefaultScanRoots(root: string, ignorePatterns: string[]): Promise<string[]> {
  const roots: string[] = [];

  for (const dirName of DEFAULT_SCAN_DIRS) {
    if (isIgnoredPath(dirName, ignorePatterns)) {
      continue;
    }
    try {
      await access(resolve(root, dirName));
      roots.push(resolve(root, dirName));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }
    }
  }

  return roots;
}

async function collectScanFiles(root: string, scanRoots: string[], ignorePatterns: string[], diffOnly: boolean): Promise<string[]> {
  if (!diffOnly) {
    const files = await Promise.all(scanRoots.map((scanRoot) => collectFiles(root, scanRoot, ignorePatterns)));
    return files.flat();
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
    const fallbackFiles = await Promise.all(scanRoots.map((scanRoot) => collectFiles(root, scanRoot, ignorePatterns)));
    return fallbackFiles.flat();
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
