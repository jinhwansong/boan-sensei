# boan-sensei Plugin Bundles

This directory contains tool-specific plugin bundles for Codex, Cursor, and Claude Code.

## Adapters vs Plugins

`adapters/`, `skills/`, and `plugins/` all support the same cautious boan-sensei workflow, but they sit at different layers.

| Path | Purpose | Install style |
| --- | --- | --- |
| `adapters/` | Lower-level single instruction files | Copy or merge one file into the target project or tool configuration |
| `skills/` | Shared boan-sensei security analysis skill drafts | Package or reference from tool-specific bundles |
| `plugins/` | Tool-specific plugin bundles | Copy the bundle shape each tool expects |

Use `adapters/` when you want the smallest possible instruction file. Use `skills/` as the shared analysis content layer. Use `plugins/` when you want a ready-to-copy bundle for a specific AI coding tool.

The top-level `skills/` directory is different from the Codex plugin-internal `plugins/codex-boan-sensei/skills/` directory. The plugin-internal directory is required by the Codex plugin manifest (`"skills": "./skills/"`) and contains the plugin's own loadable skill. The top-level `skills/` directory contains shared domain review drafts that plugin bundles can reference when deeper analysis is needed. The current CLI does not automatically wire these drafts to a `--skill` option.

## Bundle Layout

| Tool | Source bundle | Installed target | Notes |
| --- | --- | --- | --- |
| Codex | `plugins/codex-boan-sensei/` | `<codex-plugins>/codex-boan-sensei/` | Skill-only Codex plugin scaffold with `.codex-plugin/plugin.json` and `skills/boan-sensei/SKILL.md` |
| Cursor | `plugins/cursor-boan-sensei/.cursor/rules/boan-sensei.mdc` | `<target-project>/.cursor/rules/boan-sensei.mdc` | Project-level Cursor rule bundle |
| Claude Code | `plugins/claude-code-boan-sensei/boan-sensei/` | `<skills-root>/boan-sensei/` | Claude Code skill folder containing `SKILL.md` |

They all use the same local boan-sensei CLI workflow:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

As an adapter-friendly single entry point, `boan-sensei review --mode basic` may run the same scan, report, and TODO sequence. Keep the explicit three-command flow available for conservative tool workflows.

The bundles do not add MCP servers, automatic source modification, external URL scanning, or npm publishing assumptions.

For deeper domain-specific review, consult the shared drafts in the top-level `skills/<name>/SKILL.md` files.

Use `scripts/install-plugin.ps1` or `scripts/install-plugin.sh` to copy a bundle into a target project or tool-specific folder.

## Installation Path Verification

The install paths documented here match the current repository scripts, but they still need separate verification against the latest official Codex, Cursor, and Claude Code documentation before distribution. This repository does not claim those tool-specific discovery paths are permanently correct.

## Install

PowerShell:

```powershell
.\scripts\install-plugin.ps1 codex C:\path\to\codex-plugins
.\scripts\install-plugin.ps1 cursor C:\path\to\project
.\scripts\install-plugin.ps1 claude C:\path\to\skills-root
```

POSIX shell:

```bash
scripts/install-plugin.sh codex /path/to/codex-plugins
scripts/install-plugin.sh cursor /path/to/project
scripts/install-plugin.sh claude /path/to/skills-root
```

The installer scripts do not silently overwrite an existing target. When a target already exists, they copy a merge candidate into `.boan-sensei-plugin/` under the target path.

The target project or tool environment still needs access to the local `boan-sensei` CLI command before the workflow can run.
