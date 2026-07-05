[English](./README.md) | [한국어](./README.ko.md)

# boan-sensei

## Short Description

`boan-sensei` is an adapter-first frontend security review workflow pack for AI coding tools such as Codex, Cursor, and Claude Code.

The CLI in `apps/cli` is the local execution engine that adapters call. The main goal is not to install a global CLI from npm first, but to place the right adapter into your AI coding tool and let it run a cautious local review workflow.

## What boan-sensei Does

- Gives AI coding tools a repeatable frontend security review workflow.
- Scans frontend files under `src`.
- Collects keyword-based code signals such as browser storage, public environment variables, iframe usage, cross-window messaging, and debug output.
- Writes structured findings to `.boan-sensei/findings.json`.
- Generates Markdown reports for different review modes.
- Generates a developer TODO checklist.
- Keeps CLI output short so AI tool context does not get flooded.

## What boan-sensei Does Not Do

- It does not confirm security impact.
- It does not perform penetration testing.
- It does not scan external URLs.
- It does not connect to an external security database.
- It does not run `npm audit`.
- It does not automatically modify source code.

Use the output as a review aid, not as a final security decision.

## Adapter-First Setup

Use the adapter that matches your AI coding tool:

- Claude Code: `adapters/claude/boan-sensei/SKILL.md`
- Cursor: `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- Codex: `adapters/codex/AGENTS.md`

Detailed copy/install instructions are in `adapters/INSTALL.md`.

Copy or link the adapter file into the location your tool expects. The adapter tells the AI tool when to run `boan-sensei`, which mode to use, and how to describe results cautiously.

You can also use the installer scripts:

```bash
scripts/install-adapter.sh codex /path/to/project
scripts/install-adapter.sh cursor /path/to/project
scripts/install-adapter.sh claude /path/to/skills-root
```

On Windows:

```powershell
.\scripts\install-adapter.ps1 codex C:\path\to\project
.\scripts\install-adapter.ps1 cursor C:\path\to\project
.\scripts\install-adapter.ps1 claude C:\path\to\skills-root
```

For tool-specific plugin bundles:

```bash
scripts/install-plugin.sh codex /path/to/codex-plugins
scripts/install-plugin.sh cursor /path/to/project
scripts/install-plugin.sh claude /path/to/skills-root
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 codex C:\path\to\codex-plugins
.\scripts\install-plugin.ps1 cursor C:\path\to\project
.\scripts\install-plugin.ps1 claude C:\path\to\skills-root
```

Adapter files, shared skill drafts, and plugin bundles have different jobs:

- `adapters/`: lower-level single instruction files you copy or merge into a target project or tool configuration.
- `skills/`: shared boan-sensei security analysis skill drafts.
- `plugins/`: tool-specific bundles that package the same workflow in the shape Codex, Cursor, or Claude Code expects.

See `plugins/README.md` for the exact target layout and per-tool differences.

The local CLI engine still needs to be available in the repository or workspace where the adapter runs. During development, build it from this repository:

```bash
pnpm install
pnpm build
```

If the `boan-sensei` command is not available in the target tool, the adapter should ask the user how to expose the local CLI instead of assuming npm publishing.

## CLI Usage

In normal adapter-first use, these commands are usually called by the adapter rather than typed directly by the user.

These are the commands the adapters are designed to run:

```bash
boan-sensei scan
boan-sensei report
boan-sensei todo
boan-sensei pr-comment
```

Mode-specific reports:

```bash
boan-sensei scan --mode blue
boan-sensei report --mode blue

boan-sensei scan --mode red
boan-sensei report --mode red

boan-sensei scan --mode purple
boan-sensei report --mode purple
```

Future package distribution may also support `npx boan-sensei ...`, but npm publishing is not the primary plugin strategy for this project.

## Commands

### `boan-sensei scan [--mode basic|blue|red|purple] [--diff]`

Scans the current working directory and writes `.boan-sensei/findings.json`.
Use `--diff` to scan changed supported files from `git diff --name-only`; if Git is unavailable, the scanner falls back to the normal full scan.

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

Add `.boan-senseiignore` at the project root to skip extra files or directories such as `dist/`, `src/generated/`, or `*.test.ts`.

### `boan-sensei report [--mode basic|blue|red|purple]`

Reads `.boan-sensei/findings.json` and writes the Markdown report for the selected mode.

### `boan-sensei todo`

Reads `.boan-sensei/findings.json` and writes `SECURITY_TODO.md`.

### `boan-sensei pr-comment`

Reads `.boan-sensei/findings.json` and writes a cautious PR comment body to `.boan-sensei/pr-comment.md`.

## Modes

| Mode | Description | Report file |
| --- | --- | --- |
| `basic` | Default frontend security review candidate report | `SECURITY_REPORT.md` |
| `blue` | Defender-oriented review report | `SECURITY_BLUE_TEAM.md` |
| `red` | Red Team Simulation report | `SECURITY_RED_TEAM_SIMULATION.md` |
| `purple` | Red perspective and Blue action report | `SECURITY_PURPLE_TEAM.md` |

Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. It only summarizes review questions from an attacker's perspective based on local code signals.

## Skills

boan-sensei is a CLI-based review tool, and it also includes shared security analysis skill drafts for future reuse by AI coding agents such as Claude Code, Cursor, and Codex.

The tool-specific plugin bundles under `plugins/` can package or reference these drafts for Codex, Cursor, and Claude Code. These files are not new CLI behavior, and the CLI does not implement a `--skill` option yet.

```text
skills/
  frontend-security-review/SKILL.md
  token-auth-review/SKILL.md
  xss-review/SKILL.md
  external-content-review/SKILL.md
  dependency-review/SKILL.md
  report-writer/SKILL.md
```

The skill drafts cover:

- broad frontend security review candidates
- authentication and token flow review candidates
- XSS and HTML rendering review candidates
- iframe, embed, external link, `window.open`, `postMessage`, and CSP review candidates
- frontend dependency review candidates
- cautious Markdown report writing from collected findings

All skills follow the same safety principles: do not confirm vulnerabilities, do not perform real attacks, do not automate exploit or bypass steps, and assume the user owns or has permission to review the project.

## Generated Files

- `.boan-sensei/findings.json`
- `SECURITY_REPORT.md`
- `SECURITY_TODO.md`
- `SECURITY_BLUE_TEAM.md`
- `SECURITY_RED_TEAM_SIMULATION.md`
- `SECURITY_PURPLE_TEAM.md`

## Safety Disclaimer

`boan-sensei` organizes frontend security review candidates as supporting material. It does not replace penetration testing, security certification, or professional security assessment.

Recommended wording:

- Review candidate
- Needs review
- Recommended check
- Code signal detected

## AI Coding Tool Adapters

The adapters are the primary integration surface:

- `adapters/INSTALL.md`
- `adapters/claude/boan-sensei/SKILL.md`
- `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- `adapters/codex/AGENTS.md`
- `plugins/codex-boan-sensei`
- `plugins/cursor-boan-sensei`
- `plugins/claude-code-boan-sensei`

They explain:

- when to use `boan-sensei`
- how to run `scan`, `report`, and `todo`
- which mode to choose
- how to avoid overstating results
- why report output still needs human review

MCP servers, automatic fixes, and full marketplace-style plugin packaging are outside the current scope.

`plugins/codex-boan-sensei` is a skill-only Codex plugin scaffold. `plugins/cursor-boan-sensei` packages the Cursor rule into a project-level `.cursor/rules/` layout. `plugins/claude-code-boan-sensei` packages a Claude Code skill folder. They do not add MCP servers.

## Examples

- `examples/frontend-sample`: a tiny frontend project you can use to try `scan`, `report`, and `todo`.
- `examples/adapter-install`: a copy guide for placing adapter files into another project.

## Development

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Project layout:

```text
packages/core      scanning, report generation, mode templates
apps/cli           Node.js CLI execution engine
adapters           AI coding tool guidance
templates          future template examples
docs               project notes and design docs
examples           runnable and copyable usage examples
plugins            tool-specific Codex, Cursor, and Claude Code plugin bundles
skills             shared security analysis skill drafts for plugin bundles
scripts            adapter installer scripts
```

## License

This project is released under the MIT License. See `LICENSE`.
