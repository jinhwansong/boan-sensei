# boan-sensei

`boan-sensei` is a free open-source CLI that collects frontend security review candidates and turns them into developer-friendly Markdown reports.

It does not confirm vulnerabilities, run penetration tests, or replace professional security assessment. Findings are always review candidates that need human confirmation.

## Install

```bash
pnpm install
pnpm build
```

During local development, run the CLI through pnpm:

```bash
pnpm --filter boan-sensei exec boan-sensei scan
pnpm --filter boan-sensei exec boan-sensei report
pnpm --filter boan-sensei exec boan-sensei todo
```

## Commands

### `boan-sensei scan`

Scans the current working directory and writes:

```text
.boan-sensei/findings.json
```

The scanner checks `src` files with these extensions:

- `.js`
- `.jsx`
- `.ts`
- `.tsx`
- `.vue`

The scanner skips:

- `node_modules`
- `dist`
- `build`
- `.next`
- `.git`
- `coverage`

v0.1 keyword candidates:

- `localStorage`
- `sessionStorage`
- `document.cookie`
- `dangerouslySetInnerHTML`
- `innerHTML`
- `iframe`
- `target="_blank"`
- `window.open`
- `postMessage`
- `NEXT_PUBLIC_`
- `VITE_`
- `sourcemap`
- `sourceMap`
- `console.log`

### `boan-sensei report`

Reads `.boan-sensei/findings.json` and writes:

```text
SECURITY_REPORT.md
```

The report includes overview, scope, summary, detailed review candidates, follow-up checks, and a disclaimer.

### `boan-sensei todo`

Reads `.boan-sensei/findings.json` and writes:

```text
SECURITY_TODO.md
```

Each finding becomes a developer checklist item.

## Finding Shape

```ts
{
  id: string;
  category: string;
  risk: "high" | "medium" | "low";
  status: "needs_review";
  title: string;
  message: string;
  evidence: {
    filePath: string;
    lineNumber: number;
    linePreview: string;
  };
}
```

## Development

```bash
pnpm test
pnpm typecheck
pnpm build
```

## v0.1 Scope

- TypeScript monorepo with `packages/core` and `apps/cli`
- Node.js CLI with `scan`, `report`, and `todo`
- Markdown report and TODO generation
- Vitest coverage for scanner and report generation
- Placeholder adapter folders for future Claude, Cursor, and Codex integrations

MCP server, Claude Skill, Cursor Rule, and Codex Plugin integrations are intentionally not implemented in v0.1.

## Security Notice

This report is an auxiliary document for organizing frontend security review candidates. It does not replace penetration testing, security certification, or professional security assessment.
