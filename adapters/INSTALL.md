# Installing boan-sensei Adapters

This directory is the adapter pack for boan-sensei. The CLI is the local execution engine; the adapter files tell an AI coding tool when and how to run it.

## Before Installing

In the boan-sensei repository, build the local CLI engine:

```bash
pnpm install
pnpm build
```

The adapter expects a `boan-sensei` command to be available in the target workflow. During local development, use the repository command documented in each adapter README, or expose the built CLI in your tool environment.

If the command is missing, the adapter should stop and ask the user how to expose the local CLI engine. It should not assume npm publishing is required.

## Claude

Copy the Claude skill folder:

```text
adapters/claude/boan-sensei/
```

into the skill location supported by your Claude setup. The folder must keep this shape:

```text
boan-sensei/
  SKILL.md
```

For plain Claude web/app usage, upload or paste the contents of `SKILL.md`; regular Claude chat may not read a GitHub repository from a URL by itself.

## Cursor

Copy this file into the target project:

```text
adapters/cursor/.cursor/rules/boan-sensei.mdc
```

Target path:

```text
<your-project>/.cursor/rules/boan-sensei.mdc
```

## Codex

Copy this file into the target project:

```text
adapters/codex/AGENTS.md
```

Target path:

```text
<your-project>/AGENTS.md
```

If the target project already has an `AGENTS.md`, merge the boan-sensei guidance instead of replacing existing project instructions.

## Safety Language

Adapters should use cautious wording:

- Review candidate
- Needs review
- Recommended check
- Code signal detected

Do not treat boan-sensei output as a final security decision.

## Examples

- `examples/frontend-sample`: a tiny project for checking `scan`, `report`, and `todo`.
- `examples/adapter-install`: a copy guide for installing adapter files into another project.
