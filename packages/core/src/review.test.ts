import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { runReviewWorkflow } from "./index.js";

const roots: string[] = [];

async function makeProject() {
  const root = await mkdtemp(join(tmpdir(), "boan-sensei-review-"));
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
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("runReviewWorkflow", () => {
  test("runs scan, report, and todo in order for review mode", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "src/App.tsx", "const token = localStorage.getItem('token');\n");

    const result = await runReviewWorkflow(root, { mode: "blue" });

    expect(result.findings).toHaveLength(1);
    expect(result.reportFile).toBe("SECURITY_BLUE_TEAM.md");
    expect(result.todoFile).toBe("SECURITY_TODO.md");
    expect(result.senseiComment).toContain("localStorage");

    const stored = JSON.parse(await readFile(join(root, ".boan-sensei", "findings.json"), "utf8"));
    expect(stored.mode).toBe("blue");
    expect(await readFile(join(root, "SECURITY_BLUE_TEAM.md"), "utf8")).toContain("점검 후보");
    expect(await readFile(join(root, "SECURITY_TODO.md"), "utf8")).toContain("localStorage 사용 검토 권장");
  });

  test("stops before report and todo when scan fails", async () => {
    const root = await makeProject();
    await writeProjectFile(root, "package.json", "{not valid json");

    await expect(runReviewWorkflow(root, { mode: "blue" })).rejects.toThrow();
    await expect(readFile(join(root, "SECURITY_BLUE_TEAM.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(join(root, "SECURITY_TODO.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
});
