# Codex Adapter

This folder contains Codex project instructions for boan-sensei.

## File

```text
AGENTS.md
```

## Install

Copy the file into the target project root:

```text
<your-project>/AGENTS.md
```

If the target project already has an `AGENTS.md`, merge the boan-sensei section into the existing file instead of replacing project-specific instructions.

## Local CLI Requirement

The instructions expect the local command to be available:

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

Codex should treat boan-sensei output as supporting review material. Generated reports still need direct user review.
