# codex-boan-sensei

This is a Codex plugin scaffold for boan-sensei.

It is intentionally skill-only for now:

- no MCP server
- no automatic source modification
- no external URL scan
- no npm publishing assumption

The skill tells Codex when and how to run the local boan-sensei CLI workflow.

For deeper domain-specific review, consult the shared top-level drafts such as `skills/xss-review/SKILL.md`, `skills/token-auth-review/SKILL.md`, and `skills/dependency-review/SKILL.md`. These are not automatically wired to a `--skill` CLI option.

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

Validation status is tracked in `../../docs/slash-command-ux.md`. As of 2026-07-07, local Codex execution was blocked by WindowsApps `Access is denied`, so this plugin scaffold has not been load-tested in Codex on this machine. Before distribution, verify the Codex plugin installation location and manifest shape against a working Codex plugin development workflow.

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

This plugin scaffold helps collect review candidates and generate Markdown reports. Use cautious language such as "Review candidate", "Needs review", "Recommended check", and "Code signal detected". Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. After generating reports, tell the user that they must review the findings directly. Do not create or assume an MCP server for boan-sensei. It does not replace penetration testing, security certification, or professional security assessment.

## Metadata

`.codex-plugin/plugin.json` currently points `homepage`, `repository`, and `websiteURL` to `https://github.com/jinhwansong/boan-sensei`, which matches this repository's `origin` remote.
