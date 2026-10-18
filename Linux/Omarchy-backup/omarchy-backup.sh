#!/usr/bin/env bash
# ==============================================================================
# Omarchy Backup & Disaster Recovery Suite
# ==============================================================================
# Handles incremental, hardlinked snapshots of user configurations, workspaces,
# system configurations, package manifests, and themes with 3-copy rotation.
# ==============================================================================

set -eo pipefail

CONFIG_FILE="/etc/omarchy-backup/config.conf"
if [[ ! -f "$CONFIG_FILE" ]]; then
    if [[ -f "$HOME/.config/omarchy-backup/config.conf" ]]; then
        CONFIG_FILE="$HOME/.config/omarchy-backup/config.conf"
    elif [[ -f "/mnt/backup/backup.conf" ]]; then
        CONFIG_FILE="/mnt/backup/backup.conf"
    else
        echo "Error: Configuration file not found!" >&2
        exit 1
    fi
fi

# shellcheck source=/dev/null
source "$CONFIG_FILE"

# Defaults if not defined in config
BACKUP_ROOT="${BACKUP_ROOT:-/mnt/backup}"
KEEP_SNAPSHOTS="${KEEP_SNAPSHOTS:-3}"
TARGET_USER="${TARGET_USER:-shadow}"
TARGET_HOME="${TARGET_HOME:-/home/$TARGET_USER}"
WORKSPACES=("${WORKSPACES[@]:-/Main_Workspace}")
SNAPSHOT_DIR="${BACKUP_ROOT}/snapshots"
LOG_FILE="${BACKUP_ROOT}/backup.log"

# Colors for interactive output
BOLD="\033[1m"
GREEN="\033[1;32m"
BLUE="\033[1;34m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
CYAN="\033[1;36m"
NC="\033[0m"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

check_root_or_sudo() {
    if [[ $EUID -ne 0 ]]; then
        log_info "Elevating privileges to access system configurations..."
        exec sudo "$0" "$@"
    fi
}

check_backup_mount() {
    if ! mountpoint -q "$BACKUP_ROOT"; then
        log_warn "$BACKUP_ROOT is not mounted! Attempting mount..."
        mount "$BACKUP_ROOT" 2>/dev/null || {
            log_error "Failed to mount $BACKUP_ROOT. Ensure the partition is connected."
            exit 1
        }
    fi
    mkdir -p "$SNAPSHOT_DIR"
}

build_exclude_args() {
    EXCLUDE_ARGS=()
    for pat in "${EXCLUDE_PATTERNS[@]}"; do
        EXCLUDE_ARGS+=( "--exclude=$pat" )
    done
}

export_metadata() {
    local meta_dir="$1"
    mkdir -p "$meta_dir"
    log_info "Exporting system and package metadata..."

    # Native explicitly installed packages
    if command -v pacman &>/dev/null; then
        pacman -Qqe > "$meta_dir/pacman-native.txt" 2>/dev/null || true
        pacman -Qqem > "$meta_dir/pacman-aur.txt" 2>/dev/null || true
        pacman -Q > "$meta_dir/pacman-all.txt" 2>/dev/null || true
    fi

    # Flatpaks if installed
    if command -v flatpak &>/dev/null; then
        flatpak list --app --columns=application > "$meta_dir/flatpak-apps.txt" 2>/dev/null || true
    fi

    # Systemd enabled services (system & user)
    systemctl list-unit-files --state=enabled --no-legend > "$meta_dir/systemd-system-enabled.txt" 2>/dev/null || true
    systemctl --user -M "${TARGET_USER}@" list-unit-files --state=enabled --no-legend > "$meta_dir/systemd-user-enabled.txt" 2>/dev/null || true

    # Omarchy current active theme
    local current_theme
    current_theme=$(su - "$TARGET_USER" -c "omarchy theme current 2>/dev/null" || echo "Aether")
    echo "$current_theme" > "$meta_dir/omarchy-theme.txt"

    # User groups and information
    id "$TARGET_USER" > "$meta_dir/user-info.txt" 2>/dev/null || true

    # Host and timestamp info
    cat > "$meta_dir/info.json" << JSON_EOF
{
  "timestamp": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "kernel": "$(uname -r)",
  "target_user": "$TARGET_USER",
  "omarchy_theme": "$current_theme"
}
JSON_EOF
}

prune_old_snapshots() {
    log_info "Evaluating snapshot retention (keeping ${KEEP_SNAPSHOTS} most recent)..."
    local snapshots=()
    while IFS= read -r -d $'\0' snap; do
        snapshots+=("$snap")
    done < <(find "$SNAPSHOT_DIR" -maxdepth 1 -mindepth 1 -type d -name "snapshot-*" -print0 | sort -z)

    local count="${#snapshots[@]}"

    if (( count > KEEP_SNAPSHOTS )); then
        local excess=$(( count - KEEP_SNAPSHOTS ))
        log_info "Found $count snapshots. Pruning $excess oldest snapshot(s)..."
        for (( i=0; i<excess; i++ )); do
            local to_delete="${snapshots[i]}"
            log_warn "Deleting old snapshot: $to_delete"
            rm -rf "$to_delete"
        done
        log_success "Pruning complete. Active snapshots retained: $KEEP_SNAPSHOTS"
    else
        log_info "Active snapshots: $count / $KEEP_SNAPSHOTS. No pruning needed."
    fi
}

sync_standalone_restore_script() {
    local target_script="${BACKUP_ROOT}/restore.sh"
    local target_conf="${BACKUP_ROOT}/backup.conf"
    
    # Copy configuration reference
    cp -f "$CONFIG_FILE" "$target_conf" 2>/dev/null || true
    chmod 644 "$target_conf" 2>/dev/null || true

    # Ensure standalone restore script is executable
    if [[ -f "$target_script" ]]; then
        chmod +x "$target_script" 2>/dev/null || true
    fi
}

run_backup() {
    local is_auto="${1:-false}"
    check_backup_mount
    build_exclude_args

    local timestamp
    timestamp=$(date +%Y-%m-%d_%H%M%S)
    local new_snapshot="${SNAPSHOT_DIR}/snapshot-${timestamp}"
    local latest_symlink="${SNAPSHOT_DIR}/latest"

    echo "======================================================"
    log_info "Starting Omarchy backup -> $new_snapshot"
    echo "======================================================"

    mkdir -p "$new_snapshot"

    # Step 1: Export Metadata
    export_metadata "${new_snapshot}/metadata"

    # Step 2: Backup User Home (~/...)
    if [[ -d "$TARGET_HOME" ]]; then
        log_info "Backing up user home: $TARGET_HOME"
        local link_home=""
        if [[ -d "${latest_symlink}/home/${TARGET_USER}" ]]; then
            link_home="--link-dest=${latest_symlink}/home/${TARGET_USER}"
            log_info "Found previous snapshot. Hardlinking unchanged user files..."
        fi
        mkdir -p "${new_snapshot}/home/${TARGET_USER}"
        rsync -aAXH --delete \
            $link_home \
            "${EXCLUDE_ARGS[@]}" \
            "${TARGET_HOME}/" \
            "${new_snapshot}/home/${TARGET_USER}/"
    fi

    # Step 3: Backup Configured Workspaces (/Main_Workspace, etc.)
    for ws in "${WORKSPACES[@]}"; do
        if [[ -d "$ws" ]]; then
            local ws_name
            ws_name=$(basename "$ws")
            log_info "Backing up workspace: $ws -> workspaces/$ws_name"
            local link_ws=""
            if [[ -d "${latest_symlink}/workspaces/${ws_name}" ]]; then
                link_ws="--link-dest=${latest_symlink}/workspaces/${ws_name}"
                log_info "Hardlinking unchanged files for workspace $ws_name..."
            fi
            mkdir -p "${new_snapshot}/workspaces/${ws_name}"
            rsync -aAXH --delete \
                $link_ws \
                "${EXCLUDE_ARGS[@]}" \
                "${ws}/" \
                "${new_snapshot}/workspaces/${ws_name}/"
        else
            log_warn "Workspace path does not exist: $ws (skipping)"
        fi
    done

    # Step 4: Backup System Configurations
    log_info "Backing up system configurations (/etc selective)..."
    mkdir -p "${new_snapshot}/system"
    for syspath in "${SYSTEM_PATHS[@]}"; do
        if [[ -e "$syspath" ]]; then
            local parent_dir
            parent_dir=$(dirname "$syspath" | sed 's|^/||')
            mkdir -p "${new_snapshot}/system/${parent_dir}"
            rsync -aAXH "$syspath" "${new_snapshot}/system/${parent_dir}/"
        fi
    done

    # Step 5: Update 'latest' symlink (relative symlink for portability)
    ln -sfn "snapshot-${timestamp}" "$latest_symlink"
    log_success "Updated 'latest' snapshot symlink -> snapshot-${timestamp}"

    # Step 6: Prune snapshots to maintain retention count
    prune_old_snapshots

    # Step 7: Update standalone restore tool on /mnt/backup
    sync_standalone_restore_script

    # Summary
    local disk_used free_space
    disk_used=$(du -sh "$new_snapshot" 2>/dev/null | cut -f1)
    free_space=$(df -h "$BACKUP_ROOT" | awk 'NR==2 {print $4}')

    echo "======================================================"
    log_success "Backup finished successfully!"
    echo -e " Snapshot location : ${CYAN}$new_snapshot${NC}"
    echo -e " Snapshot size ref : ${BOLD}$disk_used${NC}"
    echo -e " Storage available : ${BOLD}$free_space free${NC} on $BACKUP_ROOT"
    echo "======================================================"

    # Append to persistent log file
    echo "[$(date -Iseconds)] Backup SUCCESS: $new_snapshot | Size: $disk_used | Free: $free_space" >> "$LOG_FILE"
}

list_snapshots() {
    check_backup_mount
    echo ""
    echo -e "${BOLD}${CYAN}Available Snapshots in ${BACKUP_ROOT}:${NC}"
    echo "------------------------------------------------------"
    local found=0
    local latest_target=""
    if [[ -L "${SNAPSHOT_DIR}/latest" ]]; then
        latest_target=$(readlink -f "${SNAPSHOT_DIR}/latest")
    fi

    for snap in "$SNAPSHOT_DIR"/snapshot-*; do
        if [[ -d "$snap" ]]; then
            found=1
            local snap_name
            snap_name=$(basename "$snap")
            local size
            size=$(du -sh "$snap" 2>/dev/null | cut -f1)
            local is_latest=""
            if [[ -n "$latest_target" ]] && [[ "$(readlink -f "$snap")" == "$latest_target" ]]; then
                is_latest="${GREEN}(latest)${NC}"
            fi
            echo -e " • ${BOLD}$snap_name${NC} [Size: $size] $is_latest"
        fi
    done

    if [[ $found -eq 0 ]]; then
        echo " No snapshots found."
    fi

    echo "------------------------------------------------------"
    df -h "$BACKUP_ROOT" | awk 'NR==1 || NR==2'
    echo ""
}

timer_status() {
    echo ""
    echo -e "${BOLD}${CYAN}Systemd Timer Status:${NC}"
    echo "------------------------------------------------------"
    systemctl status omarchy-backup.timer --no-pager || true
    echo ""
    systemctl list-timers omarchy-backup.timer --no-pager || true
    echo ""
}

timer_enable() {
    log_info "Enabling and starting omarchy-backup.timer (Mondays 23:00)..."
    systemctl daemon-reload
    systemctl enable --now omarchy-backup.timer
    log_success "omarchy-backup.timer is now active and enabled across reboots."
}

timer_disable() {
    log_info "Disabling omarchy-backup.timer..."
    systemctl disable --now omarchy-backup.timer || true
    log_success "omarchy-backup.timer has been disabled."
}

show_menu() {
    while true; do
        echo ""
        echo -e "${BOLD}${CYAN}=====================================================${NC}"
        echo -e "${BOLD}${CYAN}          Omarchy Backup & Recovery Suite           ${NC}"
        echo -e "${BOLD}${CYAN}=====================================================${NC}"
        echo -e " ${GREEN}1)${NC} Run Backup Now (Incremental & Hardlinked)"
        echo -e " ${GREEN}2)${NC} Restore System from Backup"
        echo -e " ${GREEN}3)${NC} List Snapshots & Check Storage Space"
        echo -e " ${GREEN}4)${NC} Enable Weekly Schedule (Mon 11:00 PM)"
        echo -e " ${GREEN}5)${NC} Disable Weekly Schedule"
        echo -e " ${GREEN}6)${NC} View Timer Status & Next Run"
        echo -e " ${GREEN}7)${NC} Edit Configuration File"
        echo -e " ${RED}0)${NC} Exit"
        echo -e "${BOLD}${CYAN}=====================================================${NC}"
        read -r -p "Select an option [0-7]: " choice

        case "$choice" in
            1)
                run_backup false
                ;;
            2)
                if [[ -x "${BACKUP_ROOT}/restore.sh" ]]; then
                    "${BACKUP_ROOT}/restore.sh"
                elif [[ -x "/usr/local/bin/omarchy-restore" ]]; then
                    /usr/local/bin/omarchy-restore
                else
                    log_error "Restore tool not found!"
                fi
                ;;
            3)
                list_snapshots
                ;;
            4)
                timer_enable
                ;;
            5)
                timer_disable
                ;;
            6)
                timer_status
                ;;
            7)
                ${EDITOR:-nano} "$CONFIG_FILE"
                ;;
            0|q|Q)
                echo "Exiting."
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid option.${NC}"
                ;;
        esac
    done
}

# ------------------------------------------------------------------------------
# Entrypoint & CLI Flags
# ------------------------------------------------------------------------------
check_root_or_sudo "$@"

case "${1:-}" in
    --backup|-b)
        run_backup false
        ;;
    --auto|-a|--scheduled)
        run_backup true
        ;;
    --restore|-r)
        shift
        if [[ -x "${BACKUP_ROOT}/restore.sh" ]]; then
            exec "${BACKUP_ROOT}/restore.sh" "$@"
        else
            log_error "Restore tool not found at ${BACKUP_ROOT}/restore.sh"
            exit 1
        fi
        ;;
    --list|-l)
        list_snapshots
        ;;
    --timer-enable)
        timer_enable
        ;;
    --timer-disable)
        timer_disable
        ;;
    --timer-status)
        timer_status
        ;;
    --help|-h)
        echo "Usage: $(basename "$0") [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  (none)            Launch interactive menu"
        echo "  -b, --backup      Run backup now"
        echo "  -a, --auto        Run unattended backup (for systemd timer)"
        echo "  -r, --restore     Launch disaster recovery wizard"
        echo "  -l, --list        List existing snapshots and storage"
        echo "  --timer-enable    Enable weekly systemd timer (Mon 23:00)"
        echo "  --timer-disable   Disable weekly timer"
        echo "  --timer-status    Check timer schedule and status"
        echo "  -h, --help        Show this help message"
        ;;
    "")
        show_menu
        ;;
    *)
        log_error "Unknown argument: $1"
        echo "Run '$(basename "$0") --help' for usage."
        exit 1
        ;;
esac
