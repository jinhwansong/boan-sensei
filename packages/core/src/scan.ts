import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { DEFAULT_MODE, resolveMode } from "./modes.js";
import { SCAN_RULES } from "./rules.js";
import type { BoanMode, Finding, FindingsFile, ScanProjectOptions } from "./types.js";

const EXCLUDED_DIRS = new Set(["node_modules", "dist", "build", ".next", ".git", "coverage"]);
const SUPPORTED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".vue"]);

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
      for (const rule of SCAN_RULES) {
        if (!line.includes(rule.keyword)) {
          continue;
        }

        findings.push({
          id: formatFindingId(findings.length + 1),
          category: rule.category,
          risk: rule.risk,
          status: "needs_review",
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

  if (options.write) {
    await writeFindingsFile(root, findings, mode);
  }

  return findings;
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
