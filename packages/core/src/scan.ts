import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { DEFAULT_MODE, resolveMode } from "./modes.js";
import { SCAN_RULES } from "./rules.js";
import type { BoanMode, Finding, FindingsFile, ScanProjectOptions } from "./types.js";

const EXCLUDED_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "coverage"]);
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue"]);
const DEPENDENCY_PACKAGES = ["axios", "dompurify", "js-cookie", "vite", "next", "react"] as const;
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock"];

export async function scanProject(projectRoot = process.cwd(), options: ScanProjectOptions = {}): Promise<Finding[]> {
  const root = resolve(projectRoot);
  const mode = options.mode ?? DEFAULT_MODE;
  const srcRoot = resolve(root, "src");
  const files = await collectFiles(srcRoot);
  const findings: Finding[] = [];

  for (const filePath of files.sort()) {
    const contents = await readFile(filePath, "utf8");
    const lines = contents.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (shouldSkipLine(line)) {
        return;
      }

      for (const rule of SCAN_RULES) {
        if (!line.includes(rule.keyword)) {
          continue;
        }

        findings.push({
          id: formatFindingId(findings.length + 1),
          category: rule.category,
          risk: rule.risk,
          status: getFindingStatus(line, rule.keyword),
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

  findings.push(...(await collectDependencyFindings(root, findings.length)));

  if (options.write) {
    await writeFindingsFile(root, findings, mode);
  }

  return findings;
}

async function collectDependencyFindings(root: string, offset: number): Promise<Finding[]> {
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
    }
  }

  if (!(await hasAnyLockfile(root))) {
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

async function hasAnyLockfile(root: string): Promise<boolean> {
  for (const lockfile of LOCKFILES) {
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

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || /^\/\*.*\*\/$/.test(trimmed);
}

function getFindingStatus(line: string, keyword: string): Finding["status"] {
  if (
    keyword.includes("\"") ||
    stripStringLiteralContents(line).includes(keyword) ||
    looksLikeFunctionCall(line, keyword)
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
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "findings.json"), `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return output;
}

async function collectFiles(dir: string): Promise<string[]> {
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
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        files.push(...(await collectFiles(resolve(dir, entry.name))));
      }
      continue;
    }

    if (entry.isFile() && SUPPORTED_EXTENSIONS.has(getExtension(entry.name))) {
      files.push(resolve(dir, entry.name));
    }
  }
  return files;
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
