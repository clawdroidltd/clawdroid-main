#!/usr/bin/env bash
# Rebrand Clawdroid APK: remove "Made with: Cursor" badge, replace Nocracy → clawdroid.
# Requires: apktool (brew install apktool). Output APK must be re-signed for installation.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APK_SRC="${1:-$REPO_ROOT/apk/Clawdroid.apk}"
OUT_DIR="$REPO_ROOT/apk/unpacked-rebrand"
OUT_APK="$REPO_ROOT/apk/Clawdroid-rebranded-unsigned.apk"

if [[ ! -f "$APK_SRC" ]]; then
  echo "Usage: $0 [path/to/Clawdroid.apk]"
  echo "APK not found: $APK_SRC"
  exit 1
fi

if ! command -v apktool &>/dev/null; then
  echo "apktool is required. Install with: brew install apktool"
  exit 1
fi

echo "Decoding $APK_SRC with apktool..."
rm -rf "$OUT_DIR"
apktool d "$APK_SRC" -o "$OUT_DIR" -f

echo "Replacing Nocracy → clawdroid and removing 'Made with: Cursor' in decoded files..."
find "$OUT_DIR" -type f \( -name "*.xml" -o -name "*.smali" -o -name "*.yml" \) -exec grep -l -E "Nocracy|Made with|Cursor" {} \; 2>/dev/null | while read -r f; do
  sed -i '' \
    -e 's/Nocracy/clawdroid/g' \
    -e 's/Made with: Cursor/                  /g' \
    -e 's/Made with Cursor/                 /g' \
    "$f" 2>/dev/null || true
done

# Also try direct string replacement in any text file
find "$OUT_DIR" -type f -exec grep -l "Nocracy" {} \; 2>/dev/null | while read -r f; do
  sed -i '' 's/Nocracy/clawdroid/g' "$f" 2>/dev/null || true
done

echo "Building unsigned APK..."
apktool b "$OUT_DIR" -o "$OUT_APK"

echo "Done: $OUT_APK"
echo "Re-sign for installation, e.g.: apksigner sign --ks your.keystore $OUT_APK"
