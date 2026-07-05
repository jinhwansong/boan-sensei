[English](./README.md) | [한국어](./README.ko.md)

# boan-sensei

## Short Description

`boan-sensei` is a free, open-source Node.js CLI for frontend projects. It collects security review candidates from local source code and generates Markdown reports for developers and internal sharing.

It is designed to be cautious by default: CLI output stays short, detailed context goes into generated files, and results are described as review candidates that need human confirmation.

## What boan-sensei Does

- Scans frontend files under `src`.
- Collects keyword-based code signals such as browser storage, public environment variables, iframe usage, cross-window messaging, and debug output.
- Writes structured findings to `.boan-sensei/findings.json`.
- Generates Markdown reports for different review modes.
- Generates a developer TODO checklist.
- Prints a short “boan-sensei note” after scan completion.

## What boan-sensei Does Not Do

- It does not confirm security impact.
- It does not perform penetration testing.
- It does not scan external URLs.
- It does not connect to a vulnerability database.
- It does not run `npm audit`.
- It does not automatically modify source code.

Use the output as a review aid, not as a final security decision.

## Installation

After package publication, run it with `npx`:

```bash
npx boan-sensei scan
```

For local development in this repository:

```bash
pnpm install
pnpm build
pnpm --filter boan-sensei exec boan-sensei scan
```

## Usage

Basic flow:

```bash
npx boan-sensei scan
npx boan-sensei report
npx boan-sensei todo
```

Mode-specific reports:

```bash
npx boan-sensei scan --mode blue
npx boan-sensei report --mode blue

npx boan-sensei scan --mode red
npx boan-sensei report --mode red

npx boan-sensei scan --mode purple
npx boan-sensei report --mode purple
```

## Commands

### `boan-sensei scan [--mode basic|blue|red|purple]`

Scans the current working directory and writes `.boan-sensei/findings.json`.

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

### `boan-sensei report [--mode basic|blue|red|purple]`

Reads `.boan-sensei/findings.json` and writes the Markdown report for the selected mode.

### `boan-sensei todo`

Reads `.boan-sensei/findings.json` and writes `SECURITY_TODO.md`.

## Modes

| Mode | Description | Report file |
| --- | --- | --- |
| `basic` | Default frontend security review candidate report | `SECURITY_REPORT.md` |
| `blue` | Defender-oriented review report | `SECURITY_BLUE_TEAM.md` |
| `red` | Red Team Simulation report | `SECURITY_RED_TEAM_SIMULATION.md` |
| `purple` | Red perspective and Blue action report | `SECURITY_PURPLE_TEAM.md` |

Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. It only summarizes review questions from an attacker’s perspective based on local code signals.

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

Draft adapter guidance is included for AI coding tools:

- `adapters/claude/boan-sensei/SKILL.md`
- `adapters/cursor/.cursor/rules/boan-sensei.mdc`
- `adapters/codex/AGENTS.md`

These files explain when to run `boan-sensei`, how to use modes, and how to keep wording cautious. MCP servers, automatic fixes, and full plugin integrations are outside the current scope.

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
apps/cli           Node.js CLI entrypoint
adapters           AI coding tool guidance
templates          future template examples
docs               project notes and design docs
```

## License

This project is intended to be released as free open-source software. Add the repository license file before publishing a stable release.
