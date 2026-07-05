import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { REPORT_FILE_BY_MODE, resolveMode } from "./modes.js";
import { generateReport, generateTodo } from "./report.js";
import { scanProject } from "./scan.js";
import { getSenseiComment } from "./sensei-comment.js";
import type { BoanMode, Finding, ScanProjectOptions } from "./types.js";

export interface ReviewWorkflowOptions {
  mode?: BoanMode | string;
  diff?: boolean;
  registryFetch?: ScanProjectOptions["registryFetch"];
}

export interface ReviewWorkflowResult {
  findings: Finding[];
  mode: BoanMode;
  reportFile: string;
  todoFile: "SECURITY_TODO.md";
  senseiComment: string;
}

export async function runReviewWorkflow(
  projectRoot = process.cwd(),
  options: ReviewWorkflowOptions = {}
): Promise<ReviewWorkflowResult> {
  const mode = resolveMode(options.mode);
  const findings = await scanProject(projectRoot, {
    write: true,
    mode,
    diff: options.diff,
    registryFetch: options.registryFetch
  });
  const reportFile = REPORT_FILE_BY_MODE[mode];
  const todoFile = "SECURITY_TODO.md";
  const senseiComment = getSenseiComment(findings);

  await writeFile(
    resolve(projectRoot, reportFile),
    generateReport(findings, { projectRoot: resolve(projectRoot), mode }),
    "utf8"
  );
  await writeFile(resolve(projectRoot, todoFile), generateTodo(findings), "utf8");

  return {
    findings,
    mode,
    reportFile,
    todoFile,
    senseiComment
  };
}
