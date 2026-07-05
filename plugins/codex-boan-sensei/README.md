# codex-boan-sensei

This is a Codex plugin scaffold for boan-sensei.

It is intentionally skill-only for now:

- no MCP server
- no automatic source modification
- no external URL scan
- no npm publishing assumption

The skill tells Codex when and how to run the local boan-sensei CLI workflow.

Cursor and Claude Code equivalents live next to this bundle:

```text
plugins/cursor-boan-sensei
plugins/claude-code-boan-sensei
```

## Structure

```text
plugins/codex-boan-sensei/
  .codex-plugin/plugin.json
  skills/boan-sensei/SKILL.md
```

## Local Development

Build the boan-sensei repository first:

```bash
pnpm install
pnpm build
```

Then install or load this plugin scaffold according to your Codex plugin development workflow.

The target project still needs a usable `boan-sensei` CLI command or an agreed local execution path.

You can copy the bundle with:

```bash
scripts/install-plugin.sh codex /path/to/codex-plugins
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 codex C:\path\to\codex-plugins
```

## Safety

This plugin scaffold helps collect review candidates and generate Markdown reports. It does not replace penetration testing, security certification, or professional security assessment.
