#!/usr/bin/env bash
# Summarize Clawdroid agent session logs (JSON files in logs/).
# Usage: ./scripts/session-log-summary.sh [logs_dir]
# Default logs_dir: agent/logs (relative to repo root).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOGS_DIR="${1:-$REPO_ROOT/agent/logs}"

if [[ ! -d "$LOGS_DIR" ]]; then
  echo "Logs directory not found: $LOGS_DIR"
  exit 1
fi

count=0
for f in "$LOGS_DIR"/*.json; do
  [[ -f "$f" ]] || continue
  # Skip .partial.json
  [[ "$f" == *.partial.json ]] && continue
  count=$((count + 1))
  name=$(basename "$f" .json)
  if command -v jq &>/dev/null; then
    goal=$(jq -r '.goal // "n/a"' "$f" 2>/dev/null)
    steps=$(jq -r '.totalSteps // 0' "$f" 2>/dev/null)
    success=$(jq -r '.successCount // 0' "$f" 2>/dev/null)
    completed=$(jq -r '.completed // false' "$f" 2>/dev/null)
    echo "$name | goal: $goal | steps: $steps | ok: $success | completed: $completed"
  else
    echo "$name"
  fi
done

echo "---"
echo "Total sessions: $count"
