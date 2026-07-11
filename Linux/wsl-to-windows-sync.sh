#!/bin/bash

set -euo pipefail

SRC="/Main_Workspace/"
DST="/mnt/e/Upskill_Main/Main_Workspace/"
LOG="/root/wsl-to-windows-sync.log"

mkdir -p "$DST"

rsync -aHvh \
  --delete \
  --modify-window=1 \
  --stats \
  \
  --exclude=".git/" \
  --exclude=".svn/" \
  \
  --exclude="node_modules/" \
  --exclude=".venv/" \
  --exclude=".env/" \
  --exclude="ENV/" \
  --exclude="__pycache__/" \
  --exclude="*.pyc" \
  --exclude="*.pyo" \
  --exclude="*.pyd" \
  \
  --exclude=".mypy_cache/" \
  --exclude=".pytest_cache/" \
  --exclude=".ruff_cache/" \
  --exclude=".tox/" \
  --exclude=".coverage" \
  --exclude="htmlcov/" \
  \
  --exclude=".cache/" \
  --exclude=".npm/" \
  --exclude=".pnpm-store/" \
  --exclude=".yarn/" \
  --exclude=".parcel-cache/" \
  \
  --exclude=".next/" \
  --exclude=".nuxt/" \
  --exclude=".svelte-kit/" \
  --exclude="dist/" \
  --exclude="build/" \
  --exclude="out/" \
  --exclude="coverage/" \
  \
  --exclude=".idea/" \
  --exclude=".vscode/" \
  --exclude=".DS_Store" \
  --exclude="Thumbs.db" \
  \
  --exclude="*.log" \
  --exclude="*.tmp" \
  --exclude="*.swp" \
  --exclude="*.swo" \
  \
  "$SRC" "$DST" >>"$LOG" 2>&1
