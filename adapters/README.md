# adapters

This folder contains installable guidance files for using boan-sensei from AI coding tools.

boan-sensei is adapter-first: the adapter is what you place into Claude, Cursor, or Codex. The CLI under `apps/cli` is the local execution engine those adapters call.

## Install Guide

Start here:

```text
adapters/INSTALL.md
```

Installer scripts are available:

```bash
scripts/install-adapter.sh codex /path/to/project
scripts/install-adapter.sh cursor /path/to/project
scripts/install-adapter.sh claude /path/to/skills-root
```

For a copy-oriented example, see:

```text
examples/adapter-install
```

## Installation Path Verification

The install paths documented here match the current repository scripts, but each AI coding tool may change how it discovers adapter or skill files. Before relying on these paths for distribution, verify the Codex, Cursor, and Claude Code locations against the latest official tool documentation.

## Adapter Files

- Claude: `claude/boan-sensei/SKILL.md`
- Cursor: `cursor/.cursor/rules/boan-sensei.mdc`
- Codex: `codex/AGENTS.md`

## Expected Workflow

Adapters guide the AI tool to run:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

Specialized report modes:

```bash
boan-sensei scan --mode blue
boan-sensei scan --mode red
boan-sensei scan --mode purple
```

## Safety Rules

- Treat results as review candidates.
- Use cautious language such as "Needs review" and "Recommended check".
- Ask the user to review generated reports directly.
- Do not implement MCP servers or automatic fixes as part of these adapters.

For deeper domain-specific review, consult the shared drafts in the top-level `skills/` directory. Those drafts are not automatically invoked by the current CLI.

## Try It Locally

Use `examples/frontend-sample` after building the repository:

```bash
pnpm build
cd examples/frontend-sample
node ../../apps/cli/dist/index.js scan --mode basic
node ../../apps/cli/dist/index.js report --mode basic
```

## Codex Plugin Scaffold

For tool-specific plugin bundles, see:

```text
plugins/codex-boan-sensei
plugins/cursor-boan-sensei
plugins/claude-code-boan-sensei
```

These plugin bundles are separate from the lower-level adapter files and do not add MCP servers.
