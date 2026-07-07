# Cursor Adapter

This folder contains the Cursor rule for boan-sensei.

## File

```text
.cursor/rules/boan-sensei.mdc
```

## Install

Copy the rule file into the target project:

```text
<your-project>/.cursor/rules/boan-sensei.mdc
```

After copying, Cursor can use the rule when frontend security review support is requested.

Validation status is tracked in `../../docs/slash-command-ux.md`. As of 2026-07-07, Cursor `3.7.27` was available locally and the official Cursor Rules docs describe `.mdc` project rules. This adapter uses `alwaysApply: false`, so treat it as request/context-sensitive guidance rather than an always-loaded global rule.

## Local CLI Requirement

The rule expects the local command to be available:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

During development, build the CLI from this repository first:

```bash
pnpm install
pnpm build
```

## Safety

The rule must keep wording cautious:

- Review candidate
- Needs review
- Recommended check
- Code signal detected
