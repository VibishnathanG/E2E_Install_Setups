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
  "$SRC" "$DST" >>"$LOG" 2>&1
