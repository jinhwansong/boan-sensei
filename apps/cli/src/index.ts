#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateReport, generateTodo, scanProject, type FindingsFile } from "@boan-sensei/core";

const command = process.argv[2];

try {
  if (command === "scan") {
    const findings = await scanProject(process.cwd(), { write: true });
    console.log(`boan-sensei: 점검 후보 ${findings.length}건을 .boan-sensei/findings.json에 저장했습니다.`);
  } else if (command === "report") {
    const findingsFile = await readFindingsFile();
    const markdown = generateReport(findingsFile.findings, { projectRoot: findingsFile.projectRoot });
    await writeFile(resolve(process.cwd(), "SECURITY_REPORT.md"), markdown, "utf8");
    console.log("boan-sensei: SECURITY_REPORT.md를 생성했습니다.");
  } else if (command === "todo") {
    const findingsFile = await readFindingsFile();
    const markdown = generateTodo(findingsFile.findings);
    await writeFile(resolve(process.cwd(), "SECURITY_TODO.md"), markdown, "utf8");
    console.log("boan-sensei: SECURITY_TODO.md를 생성했습니다.");
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

function printHelp() {
  console.log(`boan-sensei v0.1

Usage:
  boan-sensei scan
  boan-sensei report
  boan-sensei todo`);
}
