// 현재 스캐너는 정규식/라인 기반이므로, 장기적으로 AST 기반 전환이 필요하다.
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { relative, resolve, sep } from "node:path";
import { DEFAULT_MODE, resolveMode } from "./modes.js";
import { SCAN_RULES, type ScanRule } from "./rules.js";
import type { BoanMode, Finding, FindingsFile, ScanProjectOptions } from "./types.js";

const execFileAsync = promisify(execFile);
const EXCLUDED_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "coverage"]);
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue"]);
const DIFF_SUPPORTED_EXTENSIONS = new Set([...SUPPORTED_EXTENSIONS, ".html"]);
const DEPENDENCY_PACKAGES = ["axios", "dompurify", "js-cookie", "vite", "next", "react"] as const;
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];
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

    lines.forEach((line, index) => {
      if (shouldSkipLine(line)) {
        return;
      }
      const scannableLine = getScannableLine(line);

      for (const rule of SCAN_RULES) {
        if (!matchesRule(scannableLine, rule)) {
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
  }

  findings.push(...(await collectDependencyFindings(root, findings.length, ignorePatterns, options.registryFetch)));

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
      if (lockfileVersion && normalizeVersion(version) !== normalizeVersion(lockfileVersion.version)) {
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
  await readTextLockVersions(root, "pnpm-lock.yaml", ignorePatterns, versions);
  await readTextLockVersions(root, "yarn.lock", ignorePatterns, versions);
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

async function readTextLockVersions(
  root: string,
  filePath: string,
  ignorePatterns: string[],
  versions: Map<string, LockfileVersion>
): Promise<void> {
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

  for (const packageName of DEPENDENCY_PACKAGES) {
    if (versions.has(packageName)) {
      continue;
    }

    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match =
      contents.match(new RegExp(`${escaped}@[^\\n:]+:\\s*\\n(?:\\s+[^\\n]+\\n)*?\\s+version[: ]+["']?([^"'\\s]+)`, "m")) ??
      contents.match(new RegExp(`/${escaped}@([^:/\\s]+)`, "m")) ??
      contents.match(new RegExp(`${escaped}@([^:\\s]+):`, "m"));

    if (match?.[1]) {
      versions.set(packageName, { version: match[1], filePath });
    }
  }
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
