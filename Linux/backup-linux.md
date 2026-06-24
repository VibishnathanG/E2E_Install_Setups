

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

set -euo pipefail

BASE="/backup/system-snapshots"
SNAPSHOT_DIR="$BASE/snapshots"
CURRENT="$BASE/current"
META="$BASE/meta"
DATE=$(date +"%Y-%m-%d_%H-%M")

mkdir -p "$SNAPSHOT_DIR/$DATE"
mkdir -p "$META"

echo "======================================"
echo "🚀 SYSTEM SNAPSHOT START: $DATE"
echo "======================================"

# ===========================
# FULL SYSTEM SNAPSHOT
# ===========================
rsync -aAXH --numeric-ids \
  --delete \
  --info=progress2 \
  --exclude={"/dev/*","/proc/*","/sys/*","/run/*","/tmp/*","/mnt/*","/media/*","/lost+found"} \
  --exclude="/swapfile" \
  --exclude="/backup/*" \
  --link-dest="$CURRENT" \
  / "$SNAPSHOT_DIR/$DATE/"

# Update latest pointer
rm -rf "$CURRENT"
ln -s "$SNAPSHOT_DIR/$DATE" "$CURRENT"

echo "📦 Snapshot stored: $DATE"

# ===========================
# PACKAGE LIST BACKUP
# ===========================

echo "📦 Saving package list..."

dpkg --get-selections > "$META/packages.txt"
apt-mark showmanual > "$META/manual-packages.txt"

# ===========================
# AUTO-GENERATE RESTORE SCRIPT
# ===========================

echo "🛠 Generating reinstall script..."

cat <<'EOF' > "$META/reinstall-packages.sh"
#!/bin/bash

set -e

echo "======================================"
echo "🚀 RESTORING APT PACKAGES"
echo "======================================"

dpkg --set-selections < packages.txt
apt-get update
apt-get dselect-upgrade -y

echo "======================================"
echo "✅ PACKAGE RESTORE COMPLETE"
echo "======================================"
EOF

chmod +x "$META/reinstall-packages.sh"

echo "🧠 Package restore script created"

# ===========================
# RETENTION POLICY (KEEP 2)
# ===========================

echo "🧹 Cleaning old snapshots (keeping last 2)..."

ls -1dt "$SNAPSHOT_DIR"/* 2>/dev/null | tail -n +3 | xargs -r rm -rf

echo "📦 Package Size"
du -sh "$SNAPSHOT_DIR"/*

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
