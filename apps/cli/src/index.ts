#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  generatePrComment,
  generateReport,
  generateTodo,
  getSenseiComment,
  REPORT_FILE_BY_MODE,
  resolveMode,
  scanProject,
  type FindingsFile
} from "@boan-sensei/core";

const command = process.argv[2];

try {
  const mode = resolveMode(getOptionValue("--mode"));

  if (command === "scan") {
    const findings = await scanProject(process.cwd(), { write: true, mode, diff: hasOption("--diff") });
    console.log(
      `boan-sensei: ${mode} mode로 점검 후보 ${findings.length}건을 .boan-sensei/findings.json에 저장했습니다.`
    );
    console.log(`보안선생 한마디: ${getSenseiComment(findings)}`);
  } else if (command === "report") {
    const findingsFile = await readFindingsFile();
    const markdown = generateReport(findingsFile.findings, { projectRoot: findingsFile.projectRoot, mode });
    const reportFile = REPORT_FILE_BY_MODE[mode];
    await writeFile(resolve(process.cwd(), reportFile), markdown, "utf8");
    console.log(`boan-sensei: ${reportFile}를 생성했습니다.`);
  } else if (command === "todo") {
    const findingsFile = await readFindingsFile();
    const markdown = generateTodo(findingsFile.findings);
    await writeFile(resolve(process.cwd(), "SECURITY_TODO.md"), markdown, "utf8");
    console.log("boan-sensei: SECURITY_TODO.md를 생성했습니다.");
  } else if (command === "pr-comment") {
    const findingsFile = await readFindingsFile();
    const markdown = generatePrComment(findingsFile.findings);
    await writeFile(resolve(process.cwd(), ".boan-sensei", "pr-comment.md"), markdown, "utf8");
    console.log("boan-sensei: .boan-sensei/pr-comment.md를 생성했습니다.");
  } else {
    printHelp();
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(`boan-sensei: ${(error as Error).message}`);
  process.exitCode = 1;
}

async function readFindingsFile(): Promise<FindingsFile> {
  const path = resolve(process.cwd(), ".boan-sensei", "findings.json");
  try {
    return JSON.parse(await readFile(path, "utf8")) as FindingsFile;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error("먼저 `boan-sensei scan`을 실행해 .boan-sensei/findings.json을 생성하세요.");
    }
    throw error;
  }
}

function getOptionValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

function printHelp() {
  console.log(`boan-sensei v0.1

Usage:
  boan-sensei scan [--mode basic|blue|red|purple] [--diff]
  boan-sensei report [--mode basic|blue|red|purple]
  boan-sensei todo
  boan-sensei pr-comment`);
}

function hasOption(name: string): boolean {
  return process.argv.includes(name);
}
