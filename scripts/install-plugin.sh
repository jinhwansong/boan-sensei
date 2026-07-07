#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
Usage:
  scripts/install-plugin.sh <codex|cursor|claude> <target-path>

Examples:
  scripts/install-plugin.sh codex /path/to/codex-plugins
  scripts/install-plugin.sh cursor /path/to/project
  scripts/install-plugin.sh claude /path/to/skills-root
EOF
}

if [ "$#" -ne 2 ]; then
  usage
  exit 1
fi

plugin="$1"
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
    echo "boan-sensei: installed plugin file to $dest"
  fi
}

copy_dir() {
  src="$1"
  dest="$2"
  fallback="$3"

  if [ -e "$dest" ]; then
    mkdir -p "$(dirname -- "$fallback")"
    rm -rf "$fallback"
    cp -R "$src" "$fallback"
    echo "boan-sensei: existing directory found, copied merge candidate to $fallback"
    echo "boan-sensei: review and merge it into $dest"
  else
    mkdir -p "$(dirname -- "$dest")"
    cp -R "$src" "$dest"
    echo "boan-sensei: installed plugin bundle to $dest"
  fi
}

case "$plugin" in
  codex)
    copy_dir \
      "$repo_root/plugins/codex-boan-sensei" \
      "$target/codex-boan-sensei" \
      "$target/.boan-sensei-plugin/codex-boan-sensei"
    ;;
  cursor)
    copy_file \
      "$repo_root/plugins/cursor-boan-sensei/.cursor/rules/boan-sensei.mdc" \
      "$target/.cursor/rules/boan-sensei.mdc" \
      "$target/.boan-sensei-plugin/cursor/boan-sensei.mdc"
    ;;
  claude)
    copy_dir \
      "$repo_root/plugins/claude-code-boan-sensei/boan-sensei" \
      "$target/boan-sensei" \
      "$target/.boan-sensei-plugin/claude/boan-sensei"
    ;;
  *)
    echo "boan-sensei: unknown plugin: $plugin" >&2
    usage
    exit 1
    ;;
esac

echo "boan-sensei: plugin install step completed."
echo "boan-sensei: make sure the local boan-sensei CLI command is available before running the plugin workflow."
