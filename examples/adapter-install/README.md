# Adapter Install Example

This example shows where to copy boan-sensei adapter files in a target project.

## Claude Code

Copy:

```text
adapters/claude/boan-sensei/
```

into the skill location supported by your Claude Code setup, keeping:

```text
boan-sensei/
  SKILL.md
```

For regular Claude web/app usage, upload or paste `SKILL.md` content because a plain chat may not read a GitHub repository URL by itself.

## Cursor

Copy:

```text
adapters/cursor/.cursor/rules/boan-sensei.mdc
```

to:

```text
<your-project>/.cursor/rules/boan-sensei.mdc
```

## Codex

Copy:

```text
adapters/codex/AGENTS.md
```

to:

```text
<your-project>/AGENTS.md
```

If the target project already has `AGENTS.md`, merge the boan-sensei section into the existing file.

## If the CLI Command Is Missing

The adapter should ask the user:

```text
I found the boan-sensei adapter, but the boan-sensei CLI command is not available in this workspace. How would you like me to expose the local CLI engine for this project?
```

Do not assume npm publishing is required. During local development, the repository can be built with:

```bash
pnpm install
pnpm build
```

Then the target tool can call the local execution engine according to the user's environment.
