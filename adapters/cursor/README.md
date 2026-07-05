# Cursor Adapter

This folder contains the Cursor rule for boan-sensei.

## File

```text
.cursor/rules/boan-sensei.mdc
```

## Install

Copy the rule file into the target project:

```text
<your-project>/.cursor/rules/boan-sensei.mdc
```

After copying, Cursor can use the rule when frontend security review support is requested.

## Local CLI Requirement

The rule expects the local command to be available:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

During development, build the CLI from this repository first:

```bash
pnpm install
pnpm build
```

## Safety

The rule must keep wording cautious:

- Review candidate
- Needs review
- Recommended check
- Code signal detected
