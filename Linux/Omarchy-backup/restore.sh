#!/usr/bin/env bash
# ==============================================================================
# Omarchy Standalone Disaster Recovery Tool
# ==============================================================================
# Restores configurations, packages, workspaces, themes, and services on a newly
# installed or existing Omarchy machine from a backup snapshot.
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$SCRIPT_DIR}"

if [[ ! -d "${BACKUP_ROOT}/snapshots" ]]; then
    if [[ -d "/mnt/backup/snapshots" ]]; then
        BACKUP_ROOT="/mnt/backup"
    fi
fi

SNAPSHOT_DIR="${BACKUP_ROOT}/snapshots"

# Colors
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

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_info "Elevating to root to perform system restoration..."
        exec sudo "$0" "$@"
    fi
}

detect_user() {
    if [[ -n "${SUDO_USER:-}" && "$SUDO_USER" != "root" ]]; then
        RESTORE_USER="$SUDO_USER"
    else
        RESTORE_USER=$(awk -F: '$3 == 1000 {print $1}' /etc/passwd | head -n 1)
        RESTORE_USER="${RESTORE_USER:-shadow}"
    fi
    RESTORE_HOME=$(getent passwd "$RESTORE_USER" | cut -d: -f6)
    RESTORE_HOME="${RESTORE_HOME:-/home/$RESTORE_USER}"
}

select_snapshot() {
    if [[ ! -d "$SNAPSHOT_DIR" ]]; then
        log_error "Snapshot directory $SNAPSHOT_DIR does not exist!"
        exit 1
    fi

    local snapshots=()
    while IFS= read -r -d $'\0' s; do
        snapshots+=("$s")
    done < <(find "$SNAPSHOT_DIR" -maxdepth 1 -mindepth 1 -type d -name "snapshot-*" -print0 | sort -rz)

    if [[ ${#snapshots[@]} -eq 0 ]]; then
        log_error "No snapshots found in $SNAPSHOT_DIR!"
        exit 1
    fi

    echo ""
    echo -e "${BOLD}${CYAN}Available Snapshots for Restoration:${NC}"
    echo "------------------------------------------------------"
    local i=1
    local default_idx=1
    for s in "${snapshots[@]}"; do
        local name
        name=$(basename "$s")
        local is_latest=""
        if [[ -L "${SNAPSHOT_DIR}/latest" ]] && [[ "$(readlink -f "${SNAPSHOT_DIR}/latest")" == "$(readlink -f "$s")" ]]; then
            is_latest="${GREEN}(latest)${NC}"
            default_idx=$i
        fi
        echo -e " [$i] ${BOLD}$name${NC} $is_latest"
        ((i++))
    done
    echo "------------------------------------------------------"

    read -r -p "Select snapshot to restore from [1-${#snapshots[@]}, default $default_idx]: " choice
    choice="${choice:-$default_idx}"

    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#snapshots[@]} )); then
        SELECTED_SNAPSHOT="${snapshots[$((choice - 1))]}"
    else
        log_warn "Invalid selection. Defaulting to snapshot #$default_idx."
        SELECTED_SNAPSHOT="${snapshots[$((default_idx - 1))]}"
    fi

    log_success "Selected snapshot: $(basename "$SELECTED_SNAPSHOT")"
}

restore_packages() {
    local meta_dir="${SELECTED_SNAPSHOT}/metadata"
    if [[ ! -d "$meta_dir" ]]; then
        log_error "Metadata folder not found in $SELECTED_SNAPSHOT!"
        return 1
    fi

    log_info "Step 1/2: Installing Official Native Packages..."
    if [[ -f "$meta_dir/pacman-native.txt" ]]; then
        pacman -Syu --needed --noconfirm - < "$meta_dir/pacman-native.txt" || {
            log_warn "Some packages failed to install. Continuing with individual packages..."
            while IFS= read -r pkg || [[ -n "$pkg" ]]; do
                [[ -z "$pkg" || "$pkg" =~ ^# ]] && continue
                pacman -S --needed --noconfirm "$pkg" 2>/dev/null || log_warn "Could not install $pkg"
            done < "$meta_dir/pacman-native.txt"
        }
        log_success "Native packages restored."
    else
        log_warn "No pacman-native.txt found in metadata."
    fi

    log_info "Step 2/2: Installing AUR Packages..."
    if [[ -f "$meta_dir/pacman-aur.txt" ]]; then
        # Ensure yay is present
        if ! su - "$RESTORE_USER" -c "command -v yay &>/dev/null"; then
            log_info "Bootstrapping yay (AUR helper) for $RESTORE_USER..."
            pacman -S --needed --noconfirm git base-devel
            su - "$RESTORE_USER" -c "rm -rf /tmp/yay-bin && git clone https://aur.archlinux.org/yay-bin.git /tmp/yay-bin && cd /tmp/yay-bin && makepkg -si --noconfirm" || {
                log_warn "Failed to auto-bootstrap yay. Please install yay manually."
            }
        fi

        if su - "$RESTORE_USER" -c "command -v yay &>/dev/null"; then
            su - "$RESTORE_USER" -c "yay -S --needed --noconfirm - < '$meta_dir/pacman-aur.txt'" || {
                log_warn "Some AUR packages failed. Trying one-by-one..."
                while IFS= read -r pkg || [[ -n "$pkg" ]]; do
                    [[ -z "$pkg" || "$pkg" =~ ^# ]] && continue
                    su - "$RESTORE_USER" -c "yay -S --needed --noconfirm '$pkg'" 2>/dev/null || log_warn "Could not install AUR package $pkg"
                done < "$meta_dir/pacman-aur.txt"
            }
            log_success "AUR packages restored."
        else
            log_warn "yay not available. Skipped automatic AUR package install."
        fi
    fi
}

restore_user_data() {
    local user_src="${SELECTED_SNAPSHOT}/home/${RESTORE_USER}"
    if [[ ! -d "$user_src" ]]; then
        # Fallback to any user folder in home
        user_src=$(find "${SELECTED_SNAPSHOT}/home" -maxdepth 1 -mindepth 1 -type d | head -n 1)
    fi

    if [[ -d "$user_src" ]]; then
        log_info "Restoring personal dotfiles and configs to $RESTORE_HOME..."
        mkdir -p "$RESTORE_HOME"
        rsync -aAXH --info=progress2 "$user_src/" "$RESTORE_HOME/"
        
        # Ensure correct user ownership
        chown -R "${RESTORE_USER}:${RESTORE_USER}" "$RESTORE_HOME"

        # Secure SSH credentials permissions
        if [[ -d "${RESTORE_HOME}/.ssh" ]]; then
            chmod 700 "${RESTORE_HOME}/.ssh"
            find "${RESTORE_HOME}/.ssh" -type f -exec chmod 600 {} + 2>/dev/null || true
            find "${RESTORE_HOME}/.ssh" -name "*.pub" -exec chmod 644 {} + 2>/dev/null || true
        fi
        log_success "User dotfiles and configurations restored."
    else
        log_warn "No user home snapshot found."
    fi
}

restore_workspaces() {
    local ws_dir="${SELECTED_SNAPSHOT}/workspaces"
    if [[ -d "$ws_dir" ]]; then
        log_info "Restoring project workspaces..."
        for ws in "$ws_dir"/*; do
            if [[ -d "$ws" ]]; then
                local ws_name
                ws_name=$(basename "$ws")
                local target_path="/${ws_name}"
                log_info "Restoring workspace $ws_name -> $target_path"
                mkdir -p "$target_path"
                rsync -aAXH --info=progress2 "$ws/" "$target_path/"
                chown -R "${RESTORE_USER}:${RESTORE_USER}" "$target_path"
            fi
        done
        log_success "Workspaces restored successfully."
    else
        log_warn "No workspaces found in snapshot."
    fi
}

restore_mise_runtimes() {
    log_info "Checking for mise runtime manager..."
    if su - "$RESTORE_USER" -c "command -v mise &>/dev/null"; then
        log_info "Running 'mise install' to fetch toolchains (Node/Python/Go)..."
        su - "$RESTORE_USER" -c "mise install -y" || log_warn "mise install encountered warnings."
        log_success "Mise toolchains reinstalled."
    else
        log_info "mise command not yet in PATH or not installed. Skipped."
    fi
}

restore_system_configs() {
    local sys_src="${SELECTED_SNAPSHOT}/system"
    if [[ -d "$sys_src" ]]; then
        log_info "Restoring system configurations (/etc selective)..."

        # Sudoers
        if [[ -d "${sys_src}/etc/sudoers.d" ]]; then
            cp -rn "${sys_src}/etc/sudoers.d"/* /etc/sudoers.d/ 2>/dev/null || true
            chmod 750 /etc/sudoers.d
            chmod 440 /etc/sudoers.d/* 2>/dev/null || true
            chown -R root:root /etc/sudoers.d
        fi

        # NetworkManager profiles
        if [[ -d "${sys_src}/etc/NetworkManager/system-connections" ]]; then
            mkdir -p /etc/NetworkManager/system-connections
            cp -rn "${sys_src}/etc/NetworkManager/system-connections"/* /etc/NetworkManager/system-connections/ 2>/dev/null || true
            chmod 600 /etc/NetworkManager/system-connections/* 2>/dev/null || true
            chown -R root:root /etc/NetworkManager/system-connections
        fi

        # Locale and console
        [[ -f "${sys_src}/etc/locale.conf" ]] && cp -f "${sys_src}/etc/locale.conf" /etc/locale.conf
        [[ -f "${sys_src}/etc/vconsole.conf" ]] && cp -f "${sys_src}/etc/vconsole.conf" /etc/vconsole.conf

        # Save fstab as reference only (never overwrite live fstab on fresh drive!)
        if [[ -f "${sys_src}/etc/fstab" ]]; then
            cp -f "${sys_src}/etc/fstab" /etc/fstab.backup-reference
            log_info "Saved previous /etc/fstab as /etc/fstab.backup-reference (hardware fstab was preserved)."
        fi

        log_success "System configurations restored."
    fi
}

restore_services() {
    local meta_dir="${SELECTED_SNAPSHOT}/metadata"
    if [[ -f "$meta_dir/systemd-system-enabled.txt" ]]; then
        log_info "Re-enabling systemd system services..."
        while IFS= read -r unit_line; do
            local unit
            unit=$(echo "$unit_line" | awk '{print $1}')
            if [[ -n "$unit" && "$unit" != "@" ]]; then
                systemctl enable "$unit" 2>/dev/null || true
            fi
        done < "$meta_dir/systemd-system-enabled.txt"
    fi

    if [[ -f "$meta_dir/systemd-user-enabled.txt" ]]; then
        log_info "Re-enabling systemd user services for $RESTORE_USER..."
        while IFS= read -r unit_line; do
            local unit
            unit=$(echo "$unit_line" | awk '{print $1}')
            if [[ -n "$unit" && "$unit" != "@" ]]; then
                su - "$RESTORE_USER" -c "systemctl --user enable '$unit' 2>/dev/null" || true
            fi
        done < "$meta_dir/systemd-user-enabled.txt"
    fi
    log_success "Services re-enabled."
}

restore_omarchy_theme() {
    local meta_dir="${SELECTED_SNAPSHOT}/metadata"
    local theme="Aether"
    if [[ -f "$meta_dir/omarchy-theme.txt" ]]; then
        theme=$(cat "$meta_dir/omarchy-theme.txt" | tr -d ' \n\r')
    fi

    if su - "$RESTORE_USER" -c "command -v omarchy &>/dev/null"; then
        log_info "Reapplying Omarchy theme: $theme..."
        su - "$RESTORE_USER" -c "omarchy theme set '$theme'" 2>/dev/null || true
        su - "$RESTORE_USER" -c "hyprctl reload" 2>/dev/null || true
        log_success "Omarchy theme '$theme' applied."
    fi
}

full_restore() {
    echo ""
    echo -e "${BOLD}${RED}WARNING:${NC} Full restore will synchronize packages, configurations, workspaces, and themes from:"
    echo -e " Snapshot: ${CYAN}${SELECTED_SNAPSHOT}${NC}"
    echo -e " Target user: ${BOLD}${RESTORE_USER}${NC} (${RESTORE_HOME})"
    echo ""
    read -r -p "Proceed with Full Restoration? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[yY]([eE][sS])?$ ]]; then
        echo "Aborted."
        return
    fi

    restore_packages
    restore_user_data
    restore_workspaces
    restore_mise_runtimes
    restore_system_configs
    restore_services
    restore_omarchy_theme

    echo "======================================================"
    log_success "FULL RESTORATION COMPLETE!"
    echo -e " Your Omarchy system has been restored to match the backup snapshot."
    echo -e " A system reboot is recommended to activate all services and desktop changes."
    echo "======================================================"
}

# ------------------------------------------------------------------------------
# Entrypoint & Menu
# ------------------------------------------------------------------------------
check_root "$@"
detect_user
select_snapshot

while true; do
    echo ""
    echo -e "${BOLD}${CYAN}=====================================================${NC}"
    echo -e "${BOLD}${CYAN}       Omarchy Disaster Recovery Wizard             ${NC}"
    echo -e "${BOLD}${CYAN}=====================================================${NC}"
    echo -e " Target User: ${BOLD}$RESTORE_USER${NC} | Snapshot: ${CYAN}$(basename "$SELECTED_SNAPSHOT")${NC}"
    echo "-----------------------------------------------------"
    echo -e " ${GREEN}1)${NC} Full Automated Restore (All Steps in Order)"
    echo -e " ${GREEN}2)${NC} Step 1: Reinstall Native & AUR Packages"
    echo -e " ${GREEN}3)${NC} Step 2: Restore User Dotfiles and ~/.config"
    echo -e " ${GREEN}4)${NC} Step 3: Restore /Main_Workspace and Project Folders"
    echo -e " ${GREEN}5)${NC} Step 4: Reinstall Mise Runtimes (Node/Python/Go)"
    echo -e " ${GREEN}6)${NC} Step 5: Restore System Configurations (/etc)"
    echo -e " ${GREEN}7)${NC} Step 6: Re-enable Systemd Services"
    echo -e " ${GREEN}8)${NC} Step 7: Apply Omarchy Theme & Reload Hyprland"
    echo -e " ${GREEN}9)${NC} Change Selected Snapshot"
    echo -e " ${RED}0)${NC} Exit"
    echo -e "${BOLD}${CYAN}=====================================================${NC}"
    read -r -p "Select an option [0-9]: " action

    case "$action" in
        1) full_restore ;;
        2) restore_packages ;;
        3) restore_user_data ;;
        4) restore_workspaces ;;
        5) restore_mise_runtimes ;;
        6) restore_system_configs ;;
        7) restore_services ;;
        8) restore_omarchy_theme ;;
        9) select_snapshot ;;
        0|q|Q) echo "Exiting."; exit 0 ;;
        *) echo -e "${RED}Invalid option.${NC}" ;;
    esac
done
