# boan-sensei Scripts

## Adapter Installer

Use these scripts to copy boan-sensei adapter files into another project or tool-specific folder.

macOS/Linux:

```bash
scripts/install-adapter.sh codex /path/to/project
scripts/install-adapter.sh cursor /path/to/project
scripts/install-adapter.sh claude /path/to/skills-root
```

Windows PowerShell:

```powershell
.\scripts\install-adapter.ps1 codex C:\path\to\project
.\scripts\install-adapter.ps1 cursor C:\path\to\project
.\scripts\install-adapter.ps1 claude C:\path\to\skills-root
```

The installer avoids silent overwrites. When a target file already exists, it writes a merge candidate under `.boan-sensei-adapter/`.

Installed paths:

```text
codex  -> <target>/AGENTS.md
cursor -> <target>/.cursor/rules/boan-sensei.mdc
claude -> <target>/boan-sensei/SKILL.md
```

Make sure the local `boan-sensei` CLI command is available before using the installed adapter.
