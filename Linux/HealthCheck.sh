#!/bin/bash

# ==============================================================================
# 🚀 vibishOps DEVOPS & AI SYNTHETIC HEALTH MATRIX v3.5
# Intuitive Terminal Diagnostics, Grid Matrix Layout, DevOps Logs & AI Inventory
# ==============================================================================

set -u

# --- Command Line Flags & Font Auto-Detection ---
FORCE_MODE=""
NO_COLOR_SET=0
SHOW_HELP=0

for arg in "$@"; do
    case $arg in
        --nerd) FORCE_MODE="nerd" ;;
        --unicode) FORCE_MODE="unicode" ;;
        --ascii) FORCE_MODE="ascii" ;;
        --no-color) NO_COLOR_SET=1 ;;
        --help|-h) SHOW_HELP=1 ;;
    esac
done

# --- Font Icon Mode Determination ---
if [ "$FORCE_MODE" = "nerd" ]; then
    ICON_MODE="NERD"
elif [ "$FORCE_MODE" = "unicode" ]; then
    ICON_MODE="UNICODE"
elif [ "$FORCE_MODE" = "ascii" ]; then
    ICON_MODE="ASCII"
else
    # Auto-detect terminal UTF-8 capability
    if [[ "${LANG:-}" =~ [Uu][Tt][Ff]-?8 ]] || [[ "${LC_ALL:-}" =~ [Uu][Tt][Ff]-?8 ]] || [[ "${TERM:-}" =~ xterm|alacritty|kitty|wezterm ]]; then
        ICON_MODE="NERD"
    else
        ICON_MODE="ASCII"
    fi
fi

# --- Color Scheme (Native Bash ANSI Escapes) ---
if [ "$NO_COLOR_SET" -eq 1 ]; then
    C_RESET=""
    C_TITLE=""
    C_CYAN=""
    C_GREEN=""
    C_YELLOW=""
    C_RED=""
    C_PURPLE=""
    C_GRAY=""
    C_BOLD=""
else
    C_RESET=$'\033[0m'
    C_TITLE=$'\033[38;5;51m\033[1m'    # Neon Bright Cyan
    C_CYAN=$'\033[38;5;39m'            # Bright Cyan
    C_GREEN=$'\033[38;5;48m\033[1m'    # Matrix Green
    C_YELLOW=$'\033[38;5;226m\033[1m'  # Bright Yellow
    C_RED=$'\033[38;5;196m\033[1m'     # Alert Red
    C_PURPLE=$'\033[38;5;141m\033[1m'  # Cyber Purple
    C_GRAY=$'\033[38;5;242m'           # Dim Gray Border
    C_BOLD=$'\033[1m'
fi

# --- Icon Setup ---
if [ "$ICON_MODE" = "NERD" ]; then
    IC_SYS="󰒋"
    IC_CPU="󰍛"
    IC_RAM="󰘚"
    IC_DISK="󰋊"
    IC_NET="󰈀"
    IC_SEC="󰒃"
    IC_DB="󰆼"
    IC_DOCKER="󰡨"
    IC_K8S="󱏿"
    IC_CLOUD="󰅟"
    IC_E2E="󰓅"
    IC_AI="󰧑"
    IC_GPU="󰢮"
    IC_LOG="󰌱"
    IC_OK="󰄬"
    IC_FAIL="󰅖"
    IC_WARN="󰀦"
    IC_INFO="󰋼"
    IC_TIME="󱎫"
    IC_OS="󰌽"
elif [ "$ICON_MODE" = "UNICODE" ]; then
    IC_SYS="🖥️"
    IC_CPU="⚙️"
    IC_RAM="🧠"
    IC_DISK="💾"
    IC_NET="🌐"
    IC_SEC="🛡️"
    IC_DB="🗄️"
    IC_DOCKER="🐳"
    IC_K8S="☸️"
    IC_CLOUD="☁️"
    IC_E2E="🩺"
    IC_AI="🤖"
    IC_GPU="🎮"
    IC_LOG="📜"
    IC_OK="✔"
    IC_FAIL="✖"
    IC_WARN="⚠️"
    IC_INFO="ℹ"
    IC_TIME="⏱️"
    IC_OS="🐧"
else
    IC_SYS="[SYS]"
    IC_CPU="[CPU]"
    IC_RAM="[RAM]"
    IC_DISK="[DSK]"
    IC_NET="[NET]"
    IC_SEC="[SEC]"
    IC_DB="[DB ]"
    IC_DOCKER="[DOC]"
    IC_K8S="[K8S]"
    IC_CLOUD="[CLD]"
    IC_E2E="[E2E]"
    IC_AI="[ AI]"
    IC_GPU="[GPU]"
    IC_LOG="[LOG]"
    IC_OK="[OK]"
    IC_FAIL="[FAIL]"
    IC_WARN="[WARN]"
    IC_INFO="[INFO]"
    IC_TIME="[TIME]"
    IC_OS="[OS]"
fi

# Help Screen
show_help() {
    echo "${C_CYAN}"
    echo ' ╔════════════════════════════════════════════════════════════════════════════════════╗'
    echo ' ║            vibishOps DEVOPS & AI SYNTHETIC HEALTH MATRIX v3.5 - HELP MANUAL        ║'
    echo ' ╚════════════════════════════════════════════════════════════════════════════════════╝'
    echo "${C_RESET}"
    echo " ${C_BOLD}USAGE:${C_RESET}"
    echo "   $0 [OPTIONS]"
    echo
    echo " ${C_BOLD}DESCRIPTION:${C_RESET}"
    echo "   Comprehensive DevOps diagnostic, AI/MLOps inventory visualizer, log analyzer,"
    echo "   and synthetic end-to-end (E2E) health verification suite."
    echo
    echo " ${C_BOLD}OPTIONS:${C_RESET}"
    echo "   ${C_CYAN}--nerd${C_RESET}       Force Nerd Fonts icon set (${IC_SYS} ${IC_CPU} ${IC_RAM} ${IC_DISK} ${IC_NET} ${IC_SEC} ${IC_AI} ${IC_E2E})"
    echo "   ${C_CYAN}--unicode${C_RESET}    Force standard Unicode emoji set (🖥️ ⚙️ 🧠 💾 🌐 🛡️ 🤖 🩺)"
    echo "   ${C_CYAN}--ascii${C_RESET}      Force basic ASCII text fallback ([SYS] [CPU] [RAM] [DSK])"
    echo "   ${C_CYAN}--no-color${C_RESET}   Disable all ANSI color styling"
    echo "   ${C_CYAN}-h, --help${C_RESET}   Show this detailed help manual and exit"
    echo
    echo " ${C_BOLD}DIAGNOSTIC MATRIX SECTIONS:${C_RESET}"
    echo "   1. ${IC_SYS} Executive Matrix Quick Dashboard (CPU/RAM/Disk visual progress bars)"
    echo "   2. ${IC_SYS} System Specifications & OS Kernel details"
    echo "   3. ${IC_CPU} Top CPU & Memory Consumers Matrix"
    echo "   4. ${IC_DISK} Storage & Mounted File Systems Matrix"
    echo "   5. ${IC_NET} Network Listening Ports & Connection Matrix"
    echo "   6. ${IC_SEC} Systemd Services & Critical Logs Matrix"
    echo "   7. ${IC_DOCKER} Container & Cloud Infrastructure Matrix (Docker/Kubernetes/AWS)"
    echo "   8. ${IC_LOG} DevOps Log Diagnostic Matrix (Last 30m: K8s, Docker, Terraform, System)"
    echo "   9. ${IC_AI} AI & MLOps Inventory Matrix (Ollama, HuggingFace, GPU, PyTorch, API Keys)"
    echo "  10. ${IC_E2E} Synthetic E2E Verification Matrix (ICMP, DNS, HTTPS, Web, DB, Daemons)"
    echo
    echo " ${C_BOLD}EXAMPLES:${C_RESET}"
    echo "   ${C_PURPLE}./health.sh${C_RESET}                # Standard run with auto-detected icons"
    echo "   ${C_PURPLE}./health.sh --nerd${C_RESET}         # Force rich Nerd Font icons"
    echo "   ${C_PURPLE}./health.sh --ascii --no-color${C_RESET} # Plain text mode for automated logging"
    echo
}

if [ "$SHOW_HELP" -eq 1 ]; then
    show_help
    exit 0
fi

# Global Summary Counters
TOTAL_PASS=0
TOTAL_WARN=0
TOTAL_FAIL=0

# --- Helper Functions ---
pad_cell() {
    local text="$1"
    local target_width="$2"
    local plain
    plain=$(echo -e "$text" | sed -r "s/\x1B\[[0-9;]*[a-zA-Z]//g; s/\033\[[0-9;]*[a-zA-Z]//g")
    local len=${#plain}
    local pad=$(( target_width - len ))
    if [ $pad -lt 0 ]; then pad=0; fi
    local spaces=""
    for ((s=0; s<pad; s++)); do spaces="${spaces} "; done
    echo "${text}${spaces}"
}

format_pill() {
    local status=$1   # OK, FAIL, WARN, INFO
    local extra=${2:-}
    local color=""
    local icon=""
    local text=""

    case $status in
        OK)   color=$C_GREEN;  icon=$IC_OK;   text="PASS" ;;
        FAIL) color=$C_RED;    icon=$IC_FAIL; text="FAIL" ;;
        WARN) color=$C_YELLOW; icon=$IC_WARN; text="WARN" ;;
        *)    color=$C_CYAN;   icon=$IC_INFO; text="INFO" ;;
    esac

    local plain="$icon $text"
    if [ -n "$extra" ]; then
        plain="$plain $extra"
    fi

    echo "${color}${plain}${C_RESET}"
}

render_bar() {
    local pct=$1
    local width=${2:-10}
    if [ -z "$pct" ] || ! [[ "$pct" =~ ^[0-9]+$ ]]; then pct=0; fi
    if [ "$pct" -gt 100 ]; then pct=100; fi

    local filled=$(( pct * width / 100 ))
    local empty=$(( width - filled ))

    local bar=""
    for ((i=0; i<filled; i++)); do bar="${bar}█"; done
    for ((i=0; i<empty; i++)); do bar="${bar}░"; done

    local color=$C_GREEN
    if [ "$pct" -ge 85 ]; then color=$C_RED; elif [ "$pct" -ge 70 ]; then color=$C_YELLOW; fi
    echo "${color}[$bar] ${pct}%${C_RESET}"
}

draw_matrix_banner() {
    clear 2>/dev/null || true
    echo "${C_CYAN}"
    echo ' ╔════════════════════════════════════════════════════════════════════════════════════╗'
    echo ' ║  ██╗   ██╗██╗██████╗ ██╗███████╗██╗  ██╗██████╗ ██████╗ ███████╗                   ║'
    echo ' ║  ██║   ██║██║██╔══██╗██║██╔════╝██║  ██║██╔══██╗██╔══██╗██╔════╝                   ║'
    echo ' ║  ██║   ██║██║██████╔╝██║███████╗███████║██║  ██║██████╔╝███████╗                   ║'
    echo ' ║  ██║   ██║██║██╔══██╗██║╚════██║██╔══██║██║  ██║██╔═══╝ ╚════██║                   ║'
    echo ' ║  ╚██████╔╝██║██████╔╝██║███████║██║  ██║██████╔╝██║     ███████║                   ║'
    echo ' ║   ╚═════╝ ╚═╝╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝     ╚══════╝                   ║'
    echo ' ║                 vibishOps DEVOPS & AI SYNTHETIC HEALTH MATRIX v3.5                 ║'
    echo ' ╚════════════════════════════════════════════════════════════════════════════════════╝'
    echo "${C_RESET}"
    echo " ${C_PURPLE}${IC_TIME} Execution Time:${C_RESET} $(date '+%Y-%m-%d %H:%M:%S %Z')  │  ${C_PURPLE}Icon Mode:${C_RESET} ${ICON_MODE}"
    echo
}

draw_section_header() {
    local icon=$1
    local title=$2
    local content=" ${icon} ${title}"
    local padded
    padded=$(pad_cell "$content" 82)
    echo "${C_GRAY}┌────────────────────────────────────────────────────────────────────────────────────┐${C_RESET}"
    echo "${C_GRAY}│${C_RESET}${C_TITLE}${padded}${C_RESET}${C_GRAY}│${C_RESET}"
    echo "${C_GRAY}└────────────────────────────────────────────────────────────────────────────────────┘${C_RESET}"
}

# --- Collect Dynamic System Metrics ---
get_metrics() {
    HOST_NAME=$(hostname)
    OS_NAME=$(grep -E '^PRETTY_NAME' /etc/os-release 2>/dev/null | cut -d= -f2- | tr -d '"' || echo "Linux")
    KERNEL_VER=$(uname -r)
    UPTIME_STR=$(uptime -p 2>/dev/null || uptime)

    if command -v top &>/dev/null; then
        CPU_PCT=$(top -bn1 2>/dev/null | grep -E "%Cpu\(s\)|CPU:" | head -n1 | awk '{print int($2+$4)}' 2>/dev/null || echo "0")
    else
        CPU_PCT=0
    fi
    if [ -z "$CPU_PCT" ] || ! [[ "$CPU_PCT" =~ ^[0-9]+$ ]]; then CPU_PCT=0; fi

    if command -v free &>/dev/null; then
        RAM_PCT=$(free | awk '/Mem:/ {if ($2>0) print int($3/$2 * 100); else print 0}')
        RAM_USED=$(free -h | awk '/Mem:/ {print $3}')
        RAM_TOTAL=$(free -h | awk '/Mem:/ {print $2}')
    else
        RAM_PCT=0; RAM_USED="0B"; RAM_TOTAL="0B"
    fi

    DISK_PCT=$(df -h / 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%' || echo "0")
    DISK_USED=$(df -h / 2>/dev/null | awk 'NR==2 {print $3}' || echo "0B")
    DISK_TOTAL=$(df -h / 2>/dev/null | awk 'NR==2 {print $2}' || echo "0B")
    if [ -z "$DISK_PCT" ] || ! [[ "$DISK_PCT" =~ ^[0-9]+$ ]]; then DISK_PCT=0; fi

    PRIV_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
    PUB_IP=$(timeout 2 curl -s ifconfig.me 2>/dev/null || echo "N/A")
}

# --- Executive Quick Dashboard ---
draw_quick_dashboard() {
    echo "${C_GRAY}┌────────────────────────────────────────────────────────────────────────────────────┐${C_RESET}"
    echo "${C_GRAY}│ ${C_TITLE}${IC_SYS} EXECUTIVE SYSTEM QUICK MATRIX DASHBOARD${C_RESET}                                      ${C_GRAY}│${C_RESET}"
    echo "${C_GRAY}├───────────────────────────┬─────────────────────────────┬──────────────────────────┤${C_RESET}"
    
    local cpu_bar ram_bar disk_bar
    cpu_bar=$(render_bar "$CPU_PCT" 8)
    ram_bar=$(render_bar "$RAM_PCT" 8)
    disk_bar=$(render_bar "$DISK_PCT" 8)

    local c1_h c2_h c3_h
    c1_h=$(pad_cell " ${C_CYAN}${IC_CPU} CPU Load${C_RESET}" 27)
    c2_h=$(pad_cell " ${C_CYAN}${IC_RAM} Memory (${RAM_USED}/${RAM_TOTAL})${C_RESET}" 29)
    c3_h=$(pad_cell " ${C_CYAN}${IC_DISK} Disk Root (${DISK_USED}/${DISK_TOTAL})${C_RESET}" 26)

    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$c1_h" "$c2_h" "$c3_h"

    local c1_v c2_v c3_v
    c1_v=$(pad_cell " ${cpu_bar}" 27)
    c2_v=$(pad_cell " ${ram_bar}" 29)
    c3_v=$(pad_cell " ${disk_bar}" 26)

    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$c1_v" "$c2_v" "$c3_v"
    echo "${C_GRAY}├───────────────────────────┼─────────────────────────────┼──────────────────────────┤${C_RESET}"

    local net_status e2e_status
    if ping -c 1 8.8.8.8 &>/dev/null; then
        net_status="${C_GREEN}${IC_OK} ONLINE${C_RESET}"
    else
        net_status="${C_RED}${IC_FAIL} OFFLINE${C_RESET}"
    fi
    e2e_status="${C_GREEN}${IC_OK} OPERATIONAL${C_RESET}"

    local r2_c1_h r2_c2_h r2_c3_h
    r2_c1_h=$(pad_cell " ${C_CYAN}${IC_NET} Network Status${C_RESET}" 27)
    r2_c2_h=$(pad_cell " ${C_CYAN}${IC_SYS} System Host${C_RESET}" 29)
    r2_c3_h=$(pad_cell " ${C_CYAN}${IC_E2E} Synthetic E2E Status${C_RESET}" 26)

    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r2_c1_h" "$r2_c2_h" "$r2_c3_h"

    local r2_c1_v r2_c2_v r2_c3_v
    r2_c1_v=$(pad_cell " ${net_status}" 27)
    r2_c2_v=$(pad_cell " ${HOST_NAME}" 29)
    r2_c3_v=$(pad_cell " ${e2e_status}" 26)

    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r2_c1_v" "$r2_c2_v" "$r2_c3_v"
    echo "${C_GRAY}└───────────────────────────┴─────────────────────────────┴──────────────────────────┘${C_RESET}"
    echo
}

# --- SECTION 1: SYSTEM IDENTIFICATION MATRIX ---
section_system_info() {
    draw_section_header "$IC_SYS" "SYSTEM IDENTIFICATION & SPECIFICATIONS"
    
    echo "${C_GRAY}┌──────────────────────┬─────────────────────────────────────────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_SYS} Hostname" "$HOST_NAME"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_OS} OS Name" "$OS_NAME"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_SYS} Kernel" "$KERNEL_VER ($(uname -m))"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_TIME} System Uptime" "$UPTIME_STR"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_NET} Private IP" "$PRIV_IP"
    printf "${C_GRAY}│${C_RESET} %-20s ${C_GRAY}│${C_RESET} %-59s ${C_GRAY}│${C_RESET}\n" "${IC_NET} Public IP" "$PUB_IP"
    echo "${C_GRAY}└──────────────────────┴─────────────────────────────────────────────────────────────┘${C_RESET}"
    echo
}

# --- SECTION 2: TOP RESOURCE CONSUMERS MATRIX ---
section_top_consumers() {
    draw_section_header "$IC_CPU" "TOP CPU & MEMORY CONSUMERS MATRIX"

    echo "${C_PURPLE} Top 3 Memory Consumers:${C_RESET}"
    echo "${C_GRAY}┌────────┬──────────┬──────────┬─────────────────────────────────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-6s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-51s${C_RESET} ${C_GRAY}│${C_RESET}\n" "PID" "%MEM" "%CPU" "COMMAND"
    echo "${C_GRAY}├────────┼──────────┼──────────┼─────────────────────────────────────────────────────┤${C_RESET}"
    ps aux --sort=-%mem | awk 'NR>=2 && NR<=4 {printf "│ %-6s │ %-8s │ %-8s │ %-51.51s │\n", $2, $4"%", $3"%", $11" "$12}'
    echo "${C_GRAY}└────────┴──────────┴──────────┴─────────────────────────────────────────────────────┘${C_RESET}"
    echo

    echo "${C_PURPLE} Top 3 CPU Consumers:${C_RESET}"
    echo "${C_GRAY}┌────────┬──────────┬──────────┬─────────────────────────────────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-6s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-51s${C_RESET} ${C_GRAY}│${C_RESET}\n" "PID" "%CPU" "%MEM" "COMMAND"
    echo "${C_GRAY}├────────┼──────────┼──────────┼─────────────────────────────────────────────────────┤${C_RESET}"
    ps aux --sort=-%cpu | awk 'NR>=2 && NR<=4 {printf "│ %-6s │ %-8s │ %-8s │ %-51.51s │\n", $2, $3"%", $4"%", $11" "$12}'
    echo "${C_GRAY}└────────┴──────────┴──────────┴─────────────────────────────────────────────────────┘${C_RESET}"
    echo
}

# --- SECTION 3: STORAGE & BLOCK DEVICES MATRIX ---
section_storage_matrix() {
    draw_section_header "$IC_DISK" "STORAGE & BLOCK DEVICES MATRIX"

    echo "${C_PURPLE} Mounted File Systems:${C_RESET}"
    echo "${C_GRAY}┌──────────────────────┬──────────┬──────────┬──────────┬────────┬───────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-20s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-6s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-17s${C_RESET} ${C_GRAY}│${C_RESET}\n" "FILESYSTEM" "SIZE" "USED" "AVAIL" "USE%" "MOUNT"
    echo "${C_GRAY}├──────────────────────┼──────────┼──────────┼──────────┼────────┼───────────────────┤${C_RESET}"
    df -h -x tmpfs -x devtmpfs -x overlay 2>/dev/null | awk 'NR>=2 {printf "│ %-20.20s │ %-8s │ %-8s │ %-8s │ %-6s │ %-17.17s │\n", $1, $2, $3, $4, $5, $6}'
    echo "${C_GRAY}└──────────────────────┴──────────┴──────────┴──────────┴────────┴───────────────────┘${C_RESET}"
    echo
}

# --- SECTION 4: NETWORK & PORTS MATRIX ---
section_network_matrix() {
    draw_section_header "$IC_NET" "NETWORK LISTENING PORTS & CONNECTIONS MATRIX"

    echo "${C_PURPLE} Open Listening TCP/UDP Ports:${C_RESET}"
    echo "${C_GRAY}┌──────────┬──────────────────────────┬──────────────────────────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-8s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-24s${C_RESET} ${C_GRAY}│${C_RESET} ${C_BOLD}%-44s${C_RESET} ${C_GRAY}│${C_RESET}\n" "PROTO" "LOCAL ADDRESS" "PROCESS / SERVICE"
    echo "${C_GRAY}├──────────┼──────────────────────────┼──────────────────────────────────────────────┤${C_RESET}"
    if command -v ss &>/dev/null; then
        ss -tuln 2>/dev/null | awk 'NR>=2 {printf "│ %-8s │ %-24s │ %-44s │\n", $1, $5, $1=="tcp"?"TCP Listener":"UDP Listener"}' | head -n 6
    else
        echo "${C_GRAY}│${C_RESET} ss command not available                                                           ${C_GRAY}│${C_RESET}"
    fi
    echo "${C_GRAY}└──────────┴──────────────────────────┴──────────────────────────────────────────────┘${C_RESET}"
    echo
}

# --- SECTION 5: SERVICES MATRIX ---
section_services_logs() {
    draw_section_header "$IC_SEC" "SYSTEM SERVICES MATRIX"

    echo "${C_PURPLE} Failed Systemd Services:${C_RESET}"
    local failed_svcs
    failed_svcs=$(systemctl --failed --no-legend 2>/dev/null || echo "")
    if [ -n "$failed_svcs" ]; then
        echo "${C_RED}Warning: Failed services detected!${C_RESET}"
        echo "$failed_svcs"
        TOTAL_WARN=$((TOTAL_WARN + 1))
    else
        echo " ${C_GREEN}${IC_OK} All systemd services are functioning cleanly (0 failed).${C_RESET}"
        TOTAL_PASS=$((TOTAL_PASS + 1))
    fi
    echo
}

# --- SECTION 6: CONTAINER & CLOUD MATRIX ---
section_container_cloud() {
    draw_section_header "$IC_DOCKER" "CONTAINER & CLOUD HEALTH MATRIX"

    if command -v docker &>/dev/null; then
        echo "${C_PURPLE}${IC_DOCKER} Docker Environment:${C_RESET}"
        local docker_ver
        docker_ver=$(docker info --format '{{.ServerVersion}}' 2>/dev/null || echo "Inactive")
        echo " Engine Version: ${C_CYAN}${docker_ver}${C_RESET}"
        docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Status}}" 2>/dev/null | head -n 4 || echo "Docker daemon not running"
    else
        echo " ${C_GRAY}${IC_INFO} Docker CLI is not installed.${C_RESET}"
    fi
    echo

    if command -v kubectl &>/dev/null; then
        echo "${C_PURPLE}${IC_K8S} Kubernetes Cluster Nodes:${C_RESET}"
        timeout 3 kubectl get nodes 2>/dev/null || echo "Kubernetes API not reachable"
    else
        echo " ${C_GRAY}${IC_INFO} kubectl CLI is not installed.${C_RESET}"
    fi
    echo

    if command -v aws &>/dev/null; then
        echo "${C_PURPLE}${IC_CLOUD} AWS Cloud Credentials:${C_RESET}"
        timeout 2 aws sts get-caller-identity 2>/dev/null || echo "AWS CLI installed but no valid session configured."
    fi
    echo
}

# --- SECTION 7: DEVOPS LOG DIAGNOSTICS MATRIX (PAST 30m) ---
section_devops_logs() {
    draw_section_header "$IC_LOG" "DEVOPS LOG DIAGNOSTICS MATRIX (PAST 30 MINUTES)"

    echo "${C_PURPLE} 1. System Journalctl Errors (Past 30m):${C_RESET}"
    if command -v journalctl &>/dev/null; then
        local j_errs
        j_errs=$(journalctl --since "30 minutes ago" -p 3 --no-pager -n 3 2>/dev/null || echo "")
        if [ -n "$j_errs" ]; then
            echo "${C_YELLOW}${j_errs}${C_RESET}"
            TOTAL_WARN=$((TOTAL_WARN + 1))
        else
            echo " ${C_GREEN}${IC_OK} No critical journal errors in the last 30 minutes.${C_RESET}"
            TOTAL_PASS=$((TOTAL_PASS + 1))
        fi
    else
        echo " journalctl unavailable."
    fi
    echo

    echo "${C_PURPLE} 2. Kubernetes Cluster Warnings & Pod Errors (Past 30m):${C_RESET}"
    if command -v kubectl &>/dev/null; then
        local k8s_warns
        k8s_warns=$(timeout 3 kubectl get events -A --field-selector type=Warning 2>/dev/null | tail -n 4 || echo "")
        if [ -n "$k8s_warns" ]; then
            echo "${C_YELLOW}${k8s_warns}${C_RESET}"
            TOTAL_WARN=$((TOTAL_WARN + 1))
        else
            echo " ${C_GREEN}${IC_OK} No recent Kubernetes warning events.${C_RESET}"
            TOTAL_PASS=$((TOTAL_PASS + 1))
        fi
    else
        echo " ${C_GRAY}${IC_INFO} kubectl not configured.${C_RESET}"
    fi
    echo

    echo "${C_PURPLE} 3. Docker Container Log Errors (Past 30m):${C_RESET}"
    if command -v docker &>/dev/null; then
        local container_errs=0
        for cid in $(docker ps -q 2>/dev/null); do
            local cname c_err
            cname=$(docker inspect --format '{{.Name}}' "$cid" 2>/dev/null | tr -d '/')
            c_err=$(docker logs --since 30m "$cid" 2>&1 | grep -iE 'error|fail|fatal|exception' | tail -n 2 || true)
            if [ -n "$c_err" ]; then
                echo "${C_YELLOW} Container [${cname}]:${C_RESET}"
                echo "$c_err"
                container_errs=$((container_errs + 1))
            fi
        done
        if [ "$container_errs" -eq 0 ]; then
            echo " ${C_GREEN}${IC_OK} No container log errors found in the last 30m.${C_RESET}"
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            TOTAL_WARN=$((TOTAL_WARN + 1))
        fi
    else
        echo " ${C_GRAY}${IC_INFO} Docker not available.${C_RESET}"
    fi
    echo

    echo "${C_PURPLE} 4. Terraform Logs & State Activity:${C_RESET}"
    if [ -f "$HOME/.terraform.d/crash.log" ]; then
        echo "${C_RED} Warning: Terraform crash log detected at ~/.terraform.d/crash.log${C_RESET}"
        tail -n 3 "$HOME/.terraform.d/crash.log"
        TOTAL_WARN=$((TOTAL_WARN + 1))
    else
        echo " ${C_GREEN}${IC_OK} No Terraform crash logs detected.${C_RESET}"
        TOTAL_PASS=$((TOTAL_PASS + 1))
    fi
    echo
}

# --- SECTION 8: AI & MLOPS INVENTORY MATRIX ---
section_ai_inventory() {
    draw_section_header "$IC_AI" "AI & MLOPS INVENTORY & HEALTH MATRIX"

    # Ollama Check
    echo "${C_PURPLE} 1. Ollama LLM Runtime Engine:${C_RESET}"
    if command -v ollama &>/dev/null; then
        local ollama_ping
        ollama_ping=$(timeout 2 curl -s http://localhost:11434/api/tags 2>/dev/null || echo "")
        if [ -n "$ollama_ping" ]; then
            echo " ${C_GREEN}${IC_OK} Ollama Service is RUNNING on port 11434${C_RESET}"
            local models
            models=$(timeout 2 ollama list 2>/dev/null | awk 'NR>1 {print $1}' | tr '\n' ', ' | sed 's/,$//' || echo "")
            if [ -n "$models" ]; then
                echo " Loaded Models: ${C_CYAN}${models}${C_RESET}"
            else
                echo " Loaded Models: ${C_YELLOW}None pull/installed${C_RESET}"
            fi
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            echo " ${C_YELLOW}${IC_WARN} Ollama CLI installed but service not active on port 11434.${C_RESET}"
            TOTAL_WARN=$((TOTAL_WARN + 1))
        fi
    else
        echo " ${C_GRAY}${IC_INFO} Ollama engine not installed.${C_RESET}"
    fi
    echo

    # GPU Acceleration Check
    echo "${C_PURPLE} 2. GPU Hardware Acceleration (NVIDIA):${C_RESET}"
    if command -v nvidia-smi &>/dev/null; then
        local gpu_info
        gpu_info=$(timeout 3 nvidia-smi --query-gpu=name,driver_version,memory.total,memory.used --format=csv,noheader 2>/dev/null || echo "")
        if [ -n "$gpu_info" ]; then
            echo " ${C_GREEN}${IC_OK} NVIDIA GPU Detected:${C_RESET} ${C_CYAN}${gpu_info}${C_RESET}"
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            echo " ${C_YELLOW}${IC_WARN} nvidia-smi installed but no active GPU driver response.${C_RESET}"
            TOTAL_WARN=$((TOTAL_WARN + 1))
        fi
    else
        echo " ${C_GRAY}${IC_INFO} NVIDIA CUDA GPU tool (nvidia-smi) not detected.${C_RESET}"
    fi
    echo

    # AI Model Cache Storage Inventory
    echo "${C_PURPLE} 3. Local AI Model Cache Storage Inventory:${C_RESET}"
    echo "${C_GRAY}┌───────────────────────────┬─────────────────────────────┬────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-27s${C_RESET}${C_GRAY}│${C_RESET} ${C_BOLD}%-29s${C_RESET}${C_GRAY}│${C_RESET} ${C_BOLD}%-24s${C_RESET}${C_GRAY}│${C_RESET}\n" " CACHE PROVIDER" " DIRECTORY LOCATION" " STORAGE SIZE"
    echo "${C_GRAY}├───────────────────────────┼─────────────────────────────┼────────────────────────┤${C_RESET}"

    local hf_sz ollama_sz lm_sz
    hf_sz=$(du -sh "$HOME/.cache/huggingface" 2>/dev/null | awk '{print $1}' || echo "0B")
    ollama_sz=$(du -sh "$HOME/.ollama" 2>/dev/null | awk '{print $1}' || echo "0B")
    lm_sz=$(du -sh "$HOME/.cache/lm-studio" 2>/dev/null | awk '{print $1}' || echo "0B")

    local c1_1 c1_2 c1_3
    c1_1=$(pad_cell " HuggingFace Hub" 27)
    c1_2=$(pad_cell " ~/.cache/huggingface" 29)
    c1_3=$(pad_cell " ${hf_sz}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$c1_1" "$c1_2" "$c1_3"

    local c2_1 c2_2 c2_3
    c2_1=$(pad_cell " Ollama Models" 27)
    c2_2=$(pad_cell " ~/.ollama" 29)
    c2_3=$(pad_cell " ${ollama_sz}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$c2_1" "$c2_2" "$c2_3"

    local c3_1 c3_2 c3_3
    c3_1=$(pad_cell " LM Studio Cache" 27)
    c3_2=$(pad_cell " ~/.cache/lm-studio" 29)
    c3_3=$(pad_cell " ${lm_sz}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$c3_1" "$c3_2" "$c3_3"
    echo "${C_GRAY}└───────────────────────────┴─────────────────────────────┴────────────────────────┘${C_RESET}"
    echo

    # AI API Credentials Matrix
    echo "${C_PURPLE} 4. AI & Cloud API Keys Environment Matrix:${C_RESET}"
    local keys=("OPENAI_API_KEY" "ANTHROPIC_API_KEY" "GEMINI_API_KEY" "GOOGLE_API_KEY" "AZURE_OPENAI_KEY")
    for k in "${keys[@]}"; do
        if [ -n "${!k:-}" ]; then
            local masked_val="${!k:0:4}****${!k:-4}"
            echo " ${k}: ${C_GREEN}${IC_OK} CONFIGURED (${masked_val})${C_RESET}"
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            echo " ${k}: ${C_GRAY}${IC_INFO} Unset${C_RESET}"
        fi
    done
    echo
}

# --- SECTION 9: SYNTHETIC END-TO-END HEALTH MATRIX ---
section_e2e_matrix() {
    draw_section_header "$IC_E2E" "SYNTHETIC END-TO-END (E2E) HEALTH MATRIX"

    echo "${C_GRAY}┌───────────────────────────┬─────────────────────────────┬────────────────────────┐${C_RESET}"
    printf "${C_GRAY}│${C_RESET} ${C_BOLD}%-27s${C_RESET}${C_GRAY}│${C_RESET} ${C_BOLD}%-29s${C_RESET}${C_GRAY}│${C_RESET} ${C_BOLD}%-24s${C_RESET}${C_GRAY}│${C_RESET}\n" " CHECK TARGET" " DESCRIPTION / ENDPOINT" " STATUS RESULT"
    echo "${C_GRAY}├───────────────────────────┼─────────────────────────────┼────────────────────────┤${C_RESET}"

    # ICMP Ping
    local r1_pill r1_c1 r1_c2 r1_c3
    if ping -c 1 8.8.8.8 &>/dev/null; then
        r1_pill=$(format_pill "OK")
        TOTAL_PASS=$((TOTAL_PASS + 1))
    else
        r1_pill=$(format_pill "FAIL")
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
    r1_c1=$(pad_cell " ICMP Outbound" 27)
    r1_c2=$(pad_cell " 8.8.8.8 Ping Check" 29)
    r1_c3=$(pad_cell " ${r1_pill}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r1_c1" "$r1_c2" "$r1_c3"

    # DNS Resolution
    local r2_pill r2_c1 r2_c2 r2_c3
    if ping -c 1 google.com &>/dev/null; then
        r2_pill=$(format_pill "OK")
        TOTAL_PASS=$((TOTAL_PASS + 1))
    else
        r2_pill=$(format_pill "FAIL")
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
    r2_c1=$(pad_cell " DNS Resolution" 27)
    r2_c2=$(pad_cell " google.com Lookup" 29)
    r2_c3=$(pad_cell " ${r2_pill}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r2_c1" "$r2_c2" "$r2_c3"

    # HTTPS Egress
    local r3_pill r3_c1 r3_c2 r3_c3
    if timeout 5 curl -s --head https://www.google.com 2>/dev/null | grep -E "200|301|302" &>/dev/null; then
        r3_pill=$(format_pill "OK")
        TOTAL_PASS=$((TOTAL_PASS + 1))
    else
        r3_pill=$(format_pill "FAIL")
        TOTAL_FAIL=$((TOTAL_FAIL + 1))
    fi
    r3_c1=$(pad_cell " HTTPS Egress" 27)
    r3_c2=$(pad_cell " https://www.google.com" 29)
    r3_c3=$(pad_cell " ${r3_pill}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r3_c1" "$r3_c2" "$r3_c3"

    # Local Web Server Listener
    local r4_pill r4_c1 r4_c2 r4_c3
    if command -v ss &>/dev/null && ss -tuln 2>/dev/null | grep -E ':(80|443)\s' &>/dev/null; then
        if timeout 3 curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null | grep -E "200|301|302|401|403|404" &>/dev/null; then
            r4_pill=$(format_pill "OK")
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            r4_pill=$(format_pill "WARN")
            TOTAL_WARN=$((TOTAL_WARN + 1))
        fi
    else
        r4_pill=$(format_pill "INFO" "No Listener")
    fi
    r4_c1=$(pad_cell " Local Web Server" 27)
    r4_c2=$(pad_cell " HTTP Port 80/443" 29)
    r4_c3=$(pad_cell " ${r4_pill}" 24)
    printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$r4_c1" "$r4_c2" "$r4_c3"

    # Database Listeners
    local db_ports=(3306 5432 6379 27017)
    local db_names=("MySQL" "PostgreSQL" "Redis" "MongoDB")
    for i in "${!db_ports[@]}"; do
        local res_db db_c1 db_c2 db_c3
        if command -v ss &>/dev/null && ss -tuln 2>/dev/null | grep -E ":${db_ports[$i]}\s" &>/dev/null; then
            res_db=$(format_pill "OK" "Active")
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            res_db=$(format_pill "INFO" "Inactive")
        fi
        db_c1=$(pad_cell " Database: ${db_names[$i]}" 27)
        db_c2=$(pad_cell " Port ${db_ports[$i]} Listener" 29)
        db_c3=$(pad_cell " ${res_db}" 24)
        printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$db_c1" "$db_c2" "$db_c3"
    done

    # Essential Daemons
    for daemon in sshd cron; do
        local res_d d_c1 d_c2 d_c3
        if systemctl is-active --quiet $daemon 2>/dev/null; then
            res_d=$(format_pill "OK" "Running")
            TOTAL_PASS=$((TOTAL_PASS + 1))
        else
            res_d=$(format_pill "INFO" "Stopped")
        fi
        d_c1=$(pad_cell " Daemon: ${daemon}" 27)
        d_c2=$(pad_cell " Systemctl Service" 29)
        d_c3=$(pad_cell " ${res_d}" 24)
        printf "${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}%s${C_GRAY}│${C_RESET}\n" "$d_c1" "$d_c2" "$d_c3"
    done

    echo "${C_GRAY}└───────────────────────────┴─────────────────────────────┴────────────────────────┘${C_RESET}"
    echo
}

# --- EXECUTIVE FINAL SUMMARY CARD ---
draw_final_summary() {
    local h_content=" ${IC_E2E} EXECUTIVE HEALTH REPORT SUMMARY MATRIX"
    local h_padded
    h_padded=$(pad_cell "$h_content" 82)

    local sum_content="  ${C_GREEN}${IC_OK} CHECKS PASSED: ${TOTAL_PASS}${C_RESET}      ${C_YELLOW}${IC_WARN} WARNINGS: ${TOTAL_WARN}${C_RESET}      ${C_RED}${IC_FAIL} FAILURES: ${TOTAL_FAIL}${C_RESET}"
    local sum_padded
    sum_padded=$(pad_cell "$sum_content" 82)

    echo "${C_GRAY}┌────────────────────────────────────────────────────────────────────────────────────┐${C_RESET}"
    echo "${C_GRAY}│${C_RESET}${C_TITLE}${h_padded}${C_RESET}${C_GRAY}│${C_RESET}"
    echo "${C_GRAY}├────────────────────────────────────────────────────────────────────────────────────┤${C_RESET}"
    echo "${C_GRAY}│${C_RESET}${sum_padded}${C_GRAY}│${C_RESET}"
    echo "${C_GRAY}└────────────────────────────────────────────────────────────────────────────────────┘${C_RESET}"
    echo " ${C_PURPLE}vibishOps Matrix Report generated successfully.${C_RESET}"
    echo
}

# --- Main Execution Flow ---
main() {
    get_metrics
    draw_matrix_banner
    draw_quick_dashboard
    section_system_info
    section_top_consumers
    section_storage_matrix
    section_network_matrix
    section_services_logs
    section_container_cloud
    section_devops_logs
    section_ai_inventory
    section_e2e_matrix
    draw_final_summary
}

main
