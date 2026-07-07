# cursor-boan-sensei

This is a Cursor plugin-style bundle for boan-sensei.

It packages the Cursor rule file that teaches Cursor when and how to run the local boan-sensei CLI workflow.

For deeper domain-specific review, consult the shared top-level drafts such as `skills/xss-review/SKILL.md`, `skills/token-auth-review/SKILL.md`, and `skills/dependency-review/SKILL.md`. These are not automatically wired to a `--skill` CLI option.

## Structure

```text
plugins/cursor-boan-sensei/
  .cursor/rules/boan-sensei.mdc
```

## Install

Copy the rule into a target project:

```text
<target-project>/.cursor/rules/boan-sensei.mdc
```

Validation status is tracked in `../../docs/slash-command-ux.md`. As of 2026-07-07, Cursor `3.7.27` was available locally and the official Cursor Rules docs describe `.mdc` project rules. This bundle keeps `alwaysApply: false`, so treat it as request/context-sensitive guidance rather than an always-loaded global rule.

Or use:

```bash
scripts/install-plugin.sh cursor /path/to/project
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 cursor C:\path\to\project
```

## Safety

This bundle collects review candidates and asks the user to review generated Markdown directly. Use cautious language such as "Review candidate", "Needs review", "Recommended check", and "Code signal detected". Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. Do not create or assume an MCP server for boan-sensei. It does not perform penetration testing or automatic source modification.
