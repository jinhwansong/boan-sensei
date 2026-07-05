# boan-sensei Plugin Bundles

This directory contains tool-specific plugin bundles.

These bundles are separate from the lower-level `adapters/` files:

- `plugins/codex-boan-sensei`: skill-only Codex plugin scaffold
- `plugins/cursor-boan-sensei`: Cursor rules bundle
- `plugins/claude-code-boan-sensei`: Claude Code skill bundle

They all use the same local boan-sensei CLI workflow:

```bash
boan-sensei scan --mode basic
boan-sensei report --mode basic
boan-sensei todo
```

The bundles do not add MCP servers, automatic source modification, external URL scanning, or npm publishing assumptions.

Use `scripts/install-plugin.ps1` or `scripts/install-plugin.sh` to copy a bundle into a target project or tool-specific folder.
