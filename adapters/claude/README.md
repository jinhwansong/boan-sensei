# Claude Adapter

This folder contains the Claude-compatible boan-sensei skill draft.

## Files

```text
boan-sensei/
  SKILL.md
```

## Install

Copy the whole `boan-sensei` folder into the skill location supported by your Claude setup.

For Claude Code-style skill environments, keep the folder name and `SKILL.md` file together:

```text
<claude-skills-location>/boan-sensei/SKILL.md
```

For plain Claude web/app usage, upload or paste `boan-sensei/SKILL.md`. A regular Claude chat may not automatically read an entire GitHub repository from a URL.

## Local CLI Requirement

The adapter expects the local command to be available:

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

The adapter must describe results as review candidates that need human confirmation. It must not present the report as a final security decision.
