#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-.}"
PATTERN='gradient|purple|#8a2be2|#800080'

MATCHES=$(grep -R -n -E -i --include="*.css" --include="*.scss" --include="*.less" "$PATTERN" "$TARGET_DIR" || true)
FILTERED=$(echo "$MATCHES" | grep -Ev 'No purple gradients allowed\. Use flat colors only\.' || true)

if [[ -n "$FILTERED" ]]; then
  echo "$FILTERED"
  echo "Style check failed: found prohibited gradient/purple tokens." >&2
  exit 1
else
  echo "Style check passed: no gradients or purple tokens."
fi
