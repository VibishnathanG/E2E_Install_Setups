# Omarchy Backup & Disaster Recovery Partition

This partition (`/mnt/backup`) stores automated, incremental, hardlink-deduplicated snapshots of the Omarchy Linux system, personal user configurations, dotfiles, and workspace directories.

---

## Directory Structure

```
/mnt/backup/
├── README.md              # This file
├── restore.sh             # Standalone disaster recovery tool (runs on any fresh Omarchy)
├── backup.conf            # Copy of active backup configuration
├── backup.log             # Execution history and storage log
└── snapshots/
    ├── latest -> snapshot-...  # Symlink to the most recent snapshot
    ├── snapshot-YYYY-MM-DD_... # Snapshot 1
    ├── snapshot-YYYY-MM-DD_... # Snapshot 2
    └── snapshot-YYYY-MM-DD_... # Snapshot 3 (3 copies retained; 4th rotated)
```

Each snapshot contains:
- `metadata/` : Explicit pacman & AUR package lists, systemd enabled units, Omarchy theme, user info.
- `home/shadow/` : Personal dotfiles, `~/.config/` (Hyprland, Omarchy shell, terminals), `~/.ssh/`, credentials, wallpapers, pictures.
- `workspaces/` : `/Main_Workspace` and any additional configured project folders.
- `system/` : Custom system configs (`/etc/sudoers.d/`, systemd unit files, NetworkManager connections).

---

## How to Restore on a Brand-New Machine

When booting into a newly installed Omarchy system:

1. **Mount this backup partition**:
   ```bash
   sudo mount /dev/nvme0n1p1 /mnt/backup
   ```
2. **Execute the standalone recovery tool**:
   ```bash
   sudo /mnt/backup/restore.sh
   ```
3. **Choose Option 1 ("Full Automated Restore")**:
   - Reinstalls all native packages via `pacman -S --needed`.
   - Bootstraps `yay` (if missing) and installs all AUR packages (`uniclipboard-bin`, `zen-browser-bin`, etc.).
   - Restores user dotfiles, `~/.config/`, credentials, and fixes permissions.
   - Restores `/Main_Workspace` and workspaces with user ownership.
   - Reinstalls runtime toolchains via `mise install`.
   - Restores selective `/etc` configurations (without overwriting hardware disk mounts).
   - Re-enables systemd services.
   - Reapplies your active Omarchy theme (`Aether`) and reloads Hyprland.

---

## Live System Management

On your running Omarchy installation:

* **Interactive Menu**: Run `omarchy-backup`
* **Immediate Backup**: Run `omarchy-backup --backup`
* **List Snapshots & Disk Space**: Run `omarchy-backup --list`
* **Check Weekly Timer**: Run `omarchy-backup --timer-status`
* **Restore from CLI**: Run `omarchy-restore` or `omarchy-backup --restore`

---

## Weekly Schedule & Automation

* **Schedule**: Every **Monday at 11:00 PM** (23:00:00).
* **Managed by**: `omarchy-backup.timer` and `omarchy-backup.service`.
* **Catch-up on boot**: `Persistent=true` ensures that if the system was powered off on Monday at 11 PM, it runs immediately upon the next system boot.
* **Rotation**: Automatically retains the 3 newest snapshots and prunes the 4th oldest.

---

## Adding More Folders in the Future

To add another workspace or folder to the backup:
1. Edit `~/.config/omarchy-backup/config.conf` (or `/etc/omarchy-backup/config.conf`):
   ```bash
   WORKSPACES=(
       "/Main_Workspace"
       "/Another_Workspace/Projects"   # Add your new folder here
   )
   ```
2. The next backup will automatically include and track the new directory.
