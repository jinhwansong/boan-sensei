# claude-code-boan-sensei

This is a Claude Code plugin-style skill bundle for boan-sensei.

It packages a `boan-sensei/SKILL.md` folder that can be copied into the skill location supported by the user's Claude Code setup.

For deeper domain-specific review, consult the shared top-level drafts such as `skills/xss-review/SKILL.md`, `skills/token-auth-review/SKILL.md`, and `skills/dependency-review/SKILL.md`. These are not automatically wired to a `--skill` CLI option.

## Structure

```text
plugins/claude-code-boan-sensei/
  boan-sensei/
    SKILL.md
```

## Install

Copy the `boan-sensei/` folder into the target Claude Code skills location.

Before distribution, verify this Claude Code skill installation path against the latest official Claude Code documentation.

Or use:

```bash
scripts/install-plugin.sh claude /path/to/skills-root
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 claude C:\path\to\skills-root
```

## Safety

This bundle collects review candidates and asks the user to review generated Markdown directly. Use cautious language such as "Review candidate", "Needs review", "Recommended check", and "Code signal detected". Red mode does not perform real attacks, exploitation, bypassing, or penetration testing. Do not create or assume an MCP server for boan-sensei. It does not perform penetration testing or automatic source modification.
