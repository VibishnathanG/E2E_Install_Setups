

---

# 🚀 UPDATED SYSTEM BACKUP HANDBOOK

## 📦 What is added

Inside your backup root:

```text id="s1"
/backup/system-snapshots/
  ├── snapshots/
  ├── current/
  ├── meta/
      ├── packages.txt
      ├── manual-packages.txt
      ├── reinstall-packages.sh   ← NEW
```

---

# 🚀 UPDATED SCRIPT (FULL VERSION)

Save:

```bash id="s2"
sudo nano /usr/local/bin/system-snapshot.sh
```

---

## 📜 SCRIPT (UPDATED)

```bash id="s3"
#!/bin/bash

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
```

---

# 🔐 Make executable

```bash id="s4"
sudo chmod +x /usr/local/bin/system-snapshot.sh
```

---

# ▶️ RUN BACKUP

```bash id="s5"
sudo /usr/local/bin/system-snapshot.sh
```

# Add Permission

```bash id="s5"
sudo chmod -R 777 /backup/system-snapshots
```

---

# 📦 WHAT YOU NOW GET

## ✔ System snapshot

* full OS clone (rsync)

## ✔ Package state backup

```text id="s6"
packages.txt
manual-packages.txt
```

## ✔ ONE CLICK restore script

```bash id="s7"
reinstall-packages.sh
```

---

# 🔄 RESTORE WORKFLOW (IMPORTANT)

## Step 1: restore filesystem

```bash id="s8"
rsync -aAXH /backup/system-snapshots/current/ /
```

---

## Step 2: restore packages

```bash id="s9"
cd /backup/system-snapshots/meta/
sudo ./reinstall-packages.sh
```

---

# 🧠 WHAT THIS SYSTEM REALLY ACHIEVES

You now have:

> 🟢 “Almost full AMI-style Linux cloning system”

Because it covers:

| Layer                | Status |
| -------------------- | ------ |
| Filesystem           | ✔      |
| User data            | ✔      |
| System configs       | ✔      |
| Installed packages   | ✔      |
| Reinstall automation | ✔      |

---
