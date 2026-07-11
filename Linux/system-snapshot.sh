#!/bin/bash

set -euo pipefail

BASE="/backup/system-snapshots"
SNAPSHOT_DIR="$BASE/snapshots"
CURRENT="$BASE/current"
META="$BASE/meta"
DATE=$(date +"%Y-%m-%d_%H-%M")

DEST="$SNAPSHOT_DIR/$DATE"

mkdir -p "$DEST"
mkdir -p "$META"

echo "======================================"
echo "🚀 SYSTEM SNAPSHOT START: $DATE"
echo "======================================"

# ===========================
# BUILD RSYNC OPTIONS
# ===========================

RSYNC_OPTS=(
    -aAXH
    --numeric-ids
    --delete
    --info=progress2
    --exclude=/dev/*
    --exclude=/proc/*
    --exclude=/sys/*
    --exclude=/run/*
    --exclude=/tmp/*
    --exclude=/mnt/*
    --exclude=/media/*
    --exclude=/lost+found
    --exclude=/swapfile
    --exclude=/backup/*
)

# ===========================
# INCREMENTAL MODE
# ===========================

if [[ -L "$CURRENT" ]] && [[ -d "$(readlink -f "$CURRENT")" ]]; then
    echo "🔗 Using incremental mode (--link-dest)"
    RSYNC_OPTS+=(--link-dest="$CURRENT")
else
    echo "⚠️ No previous snapshot found. Creating baseline snapshot."
fi

# ===========================
# RUN BACKUP
# ===========================

rsync "${RSYNC_OPTS[@]}" / "$DEST/"

sync

# ===========================
# UPDATE CURRENT POINTER
# ===========================

ln -sfn "$DEST" "$CURRENT"

echo "📦 Snapshot stored: $DATE"

# ===========================
# PACKAGE STATE
# ===========================

echo "📦 Saving package state..."

dpkg --get-selections > "$META/packages.txt"
apt-mark showmanual > "$META/manual-packages.txt"

# ===========================
# AUTO RESTORE SCRIPT
# ===========================

cat > "$META/reinstall-packages.sh" <<'EOF'
#!/bin/bash
set -e

echo "======================================"
echo "🚀 RESTORING APT PACKAGES"
echo "======================================"

dpkg --set-selections < packages.txt
apt-get update
apt-get dselect-upgrade -y

echo "======================================"
echo "✅ DONE"
echo "======================================"
EOF

chmod +x "$META/reinstall-packages.sh"

# ===========================
# RETENTION POLICY
# KEEP LAST 2 SNAPSHOTS
# ===========================

echo "🧹 Cleaning old snapshots (keeping last 2)..."

CURRENT_REAL=$(readlink -f "$CURRENT")

mapfile -t SNAPSHOTS < <(
    find "$SNAPSHOT_DIR" \
        -mindepth 1 \
        -maxdepth 1 \
        -type d \
        | sort
)

COUNT=${#SNAPSHOTS[@]}

if (( COUNT > 2 )); then

    DELETE_COUNT=$((COUNT - 2))

    for ((i=0; i<DELETE_COUNT; i++)); do

        SNAP="${SNAPSHOTS[$i]}"
        SNAP_REAL=$(readlink -f "$SNAP")

        if [[ "$SNAP_REAL" == "$CURRENT_REAL" ]]; then
            echo "Skipping current snapshot: $(basename "$SNAP")"
            continue
        fi

        echo "Deleting old snapshot: $(basename "$SNAP")"
        rm -rf "$SNAP"

    done
fi

# ===========================
# SIZE REPORT
# ===========================

echo
echo "📊 Snapshot sizes:"
du -sh "$SNAPSHOT_DIR"/* 2>/dev/null || true

echo
echo "======================================"
echo "✅ SYSTEM SNAPSHOT COMPLETE"
echo "======================================"

echo
echo "======================================"
echo "📖 RESTORE INSTRUCTIONS"
echo "======================================"
echo
echo "1. Install the same Ubuntu version on the new system."
echo "2. Copy /backup/system-snapshots to the new system."
echo "3. Restore with:"
echo
echo "   sudo rsync -aAXHv --numeric-ids /backup/system-snapshots/current/ /"
echo
echo "4. (Optional) Reinstall packages:"
echo
echo "   cd /backup/system-snapshots/meta"
echo "   sudo ./reinstall-packages.sh"
echo
echo "5. Reboot:"
echo
echo "   sudo reboot"
echo
echo "⚠️ Notes:"
echo "  • Do NOT restore using --delete."
echo "  • Existing files/directories not present in the backup are NOT removed."
echo "  • Virtual directories (/dev, /proc, /sys, /run) remain intact."
echo "======================================"
