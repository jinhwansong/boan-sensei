# cursor-boan-sensei

This is a Cursor plugin-style bundle for boan-sensei.

It packages the Cursor rule file that teaches Cursor when and how to run the local boan-sensei CLI workflow.

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

Or use:

```bash
scripts/install-plugin.sh cursor /path/to/project
```

Windows PowerShell:

```powershell
.\scripts\install-plugin.ps1 cursor C:\path\to\project
```

## Safety

This bundle collects review candidates and asks the user to review generated Markdown directly. It does not perform penetration testing or automatic source modification.
