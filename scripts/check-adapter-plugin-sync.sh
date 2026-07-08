#!/usr/bin/env sh
set -eu

check_file() {
  file="$1"
  label="$2"

  if [ ! -f "$file" ]; then
    echo "boan-sensei: missing $label: $file" >&2
    exit 1
  fi
}

require_pattern() {
  file="$1"
  pattern="$2"
  label="$3"

  if ! grep -Eq "$pattern" "$file"; then
    echo "boan-sensei: missing sync phrase in $file: $label" >&2
    exit 1
  fi
}

check_section_headers() {
  adapter="$1"
  plugin="$2"
  label="$3"
  adapter_headers="$(mktemp)"
  plugin_headers="$(mktemp)"

  grep '^## ' "$adapter" | sed 's/[[:space:]]*$//' > "$adapter_headers" || true
  grep '^## ' "$plugin" | sed 's/[[:space:]]*$//' > "$plugin_headers" || true

  while IFS= read -r header; do
    if [ -z "$header" ]; then
      continue
    fi
    if ! grep -Fxq "$header" "$plugin_headers"; then
      echo "boan-sensei: missing plugin section header for $label: $header" >&2
      echo "  adapter: $adapter" >&2
      echo "  plugin:  $plugin" >&2
      rm -f "$adapter_headers" "$plugin_headers"
      exit 1
    fi
  done < "$adapter_headers"

  rm -f "$adapter_headers" "$plugin_headers"
}

check_pair() {
  adapter="$1"
  plugin="$2"
  label="$3"

  check_file "$adapter" "$label adapter"
  check_file "$plugin" "$label plugin"
  check_section_headers "$adapter" "$plugin" "$label"

  for file in "$adapter" "$plugin"; do
    require_pattern "$file" "Review candidate" "Review candidate"
    require_pattern "$file" "Needs review" "Needs review"
    require_pattern "$file" "Recommended check" "Recommended check"
    require_pattern "$file" "Code signal detected" "Code signal detected"
    require_pattern "$file" "Red mode does not perform real attacks" "red mode safety"
    require_pattern "$file" "must review|inspect and confirm" "human review reminder"
    require_pattern "$file" "MCP server" "MCP server non-goal"
    require_pattern "$file" "skills/.*/SKILL\\.md|skills/ directory|skills/ 디렉터리" "top-level skills reference"
  done
}

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$repo_root"

check_file "docs/slash-command-ux.md" "adapter validation status doc"
require_pattern "docs/slash-command-ux.md" "실제 동작 확인됨" "verified status"
require_pattern "docs/slash-command-ux.md" "확인 안 됨 \\(근거:" "unverified with evidence status"
require_pattern "docs/slash-command-ux.md" "미지원 확인됨|미지원" "unsupported status vocabulary"
require_pattern "docs/slash-command-ux.md" "Cursor 3\\.7\\.27" "Cursor local evidence"
require_pattern "docs/slash-command-ux.md" "Access is denied" "Codex local blocker evidence"

check_pair \
  "adapters/codex/AGENTS.md" \
  "plugins/codex-boan-sensei/skills/boan-sensei/SKILL.md" \
  "codex"

check_pair \
  "adapters/claude/boan-sensei/SKILL.md" \
  "plugins/claude-code-boan-sensei/boan-sensei/SKILL.md" \
  "claude"

check_pair \
  "adapters/cursor/.cursor/rules/boan-sensei.mdc" \
  "plugins/cursor-boan-sensei/.cursor/rules/boan-sensei.mdc" \
  "cursor"

echo "boan-sensei: adapter/plugin safety sync check passed."
