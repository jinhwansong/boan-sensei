#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
Usage:
  scripts/install-adapter.sh <codex|cursor|claude> <target-path>

Examples:
  scripts/install-adapter.sh codex /path/to/project
  scripts/install-adapter.sh cursor /path/to/project
  scripts/install-adapter.sh claude /path/to/skills-root
EOF
}

if [ "$#" -ne 2 ]; then
  usage
  exit 1
fi

adapter="$1"
target="$2"
repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ ! -d "$target" ]; then
  echo "boan-sensei: target path does not exist: $target" >&2
  exit 1
fi

copy_file() {
  src="$1"
  dest="$2"
  fallback="$3"

  if [ -e "$dest" ]; then
    mkdir -p "$(dirname -- "$fallback")"
    cp "$src" "$fallback"
    echo "boan-sensei: existing file found, copied merge candidate to $fallback"
    echo "boan-sensei: review and merge it into $dest"
  else
    mkdir -p "$(dirname -- "$dest")"
    cp "$src" "$dest"
    echo "boan-sensei: installed adapter to $dest"
  fi
}

case "$adapter" in
  codex)
    copy_file \
      "$repo_root/adapters/codex/AGENTS.md" \
      "$target/AGENTS.md" \
      "$target/.boan-sensei-adapter/AGENTS.boan-sensei.md"
    ;;
  cursor)
    copy_file \
      "$repo_root/adapters/cursor/.cursor/rules/boan-sensei.mdc" \
      "$target/.cursor/rules/boan-sensei.mdc" \
      "$target/.boan-sensei-adapter/cursor/boan-sensei.mdc"
    ;;
  claude)
    copy_file \
      "$repo_root/adapters/claude/boan-sensei/SKILL.md" \
      "$target/boan-sensei/SKILL.md" \
      "$target/.boan-sensei-adapter/claude/boan-sensei/SKILL.md"
    ;;
  *)
    echo "boan-sensei: unknown adapter: $adapter" >&2
    usage
    exit 1
    ;;
esac

cat <<'EOF'
boan-sensei: adapter install step completed.
boan-sensei: make sure the local boan-sensei CLI command is available before running the adapter workflow.
EOF
