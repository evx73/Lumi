#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LIBRARIES="$(cygpath -u "$APPDATA")/lumi/libraries"
shopt -s nullglob
patches=("$ROOT"/patches/*.patch)

for patch in "${patches[@]}"; do
  name="$(basename "$(cygpath -w "$patch")")"
  case "$name" in
    h5p-video-echo360.patch) target="$LIBRARIES/H5P.Video-1.6" ;;
    *) echo "ERROR: No target configured for $name" >&2; exit 1 ;;
  esac

  if [[ ! -d "$target" ]]; then
    echo "ERROR: Missing target directory: $target" >&2
    exit 1
  fi

  if git -C "$(cygpath -w "$target")" apply --check "$(cygpath -w "$patch")"; then
    git -C "$(cygpath -w "$target")" apply "$(cygpath -w "$patch")"
    echo "APPLIED: $name"
  elif git -C "$(cygpath -w "$target")" apply --reverse --check "$(cygpath -w "$patch")"; then
    echo "SKIPPED (already applied): $name"
  else
    echo "ERROR: Patch cannot be applied cleanly: $name" >&2
    exit 1
  fi
done
if (( ${#patches[@]} == 0 )); then echo "No patches found."; fi
