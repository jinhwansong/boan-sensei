#!/usr/bin/env sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "usage: scripts/smoke-test-external.sh /path/to/target-project" >&2
  exit 2
fi

target="$1"
if [ ! -d "$target" ]; then
  echo "boan-sensei: target project directory not found: $target" >&2
  exit 2
fi

repo_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
start_ms="$(node -e "console.log(Date.now())")"

if command -v boan-sensei >/dev/null 2>&1; then
  scan_cmd="boan-sensei"
  scan_arg=""
elif [ -f "$repo_root/apps/cli/dist/index.js" ]; then
  scan_cmd="node"
  scan_arg="$repo_root/apps/cli/dist/index.js"
else
  echo "boan-sensei: CLI not found. Run pnpm build or expose boan-sensei on PATH." >&2
  exit 2
fi

set +e
if [ -n "$scan_arg" ]; then
  (cd "$target" && "$scan_cmd" "$scan_arg" scan --mode basic)
else
  (cd "$target" && "$scan_cmd" scan --mode basic)
fi
scan_status="$?"
set -e

end_ms="$(node -e "console.log(Date.now())")"
elapsed_ms=$((end_ms - start_ms))

if [ "$scan_status" -ne 0 ]; then
  echo "boan-sensei: smoke scan failed with exit code $scan_status after ${elapsed_ms}ms" >&2
  exit "$scan_status"
fi

node -e "
const fs = require('fs');
const path = require('path');
const file = path.join(process.argv[1], '.boan-sensei', 'findings.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const counts = data.findings.reduce((acc, finding) => {
  acc[finding.risk] = (acc[finding.risk] || 0) + 1;
  return acc;
}, { high: 0, medium: 0, low: 0 });
console.log(\`boan-sensei smoke: high=\${counts.high || 0} medium=\${counts.medium || 0} low=\${counts.low || 0} total=\${data.findings.length} elapsedMs=${elapsed_ms}\`);
" "$target"
