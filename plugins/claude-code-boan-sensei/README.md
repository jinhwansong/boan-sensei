# claude-code-boan-sensei

This is a Claude Code plugin-style skill bundle for boan-sensei.

It packages a `boan-sensei/SKILL.md` folder that can be copied into the skill location supported by the user's Claude Code setup.

## Structure

```text
plugins/claude-code-boan-sensei/
  boan-sensei/
    SKILL.md
```

## Install

Copy the `boan-sensei/` folder into the target Claude Code skills location.

Or use:

```bash
scripts/install-plugin.sh claude /path/to/skills-root
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 claude C:\path\to\skills-root
```

## Safety

This bundle collects review candidates and asks the user to review generated Markdown directly. It does not perform penetration testing or automatic source modification.
