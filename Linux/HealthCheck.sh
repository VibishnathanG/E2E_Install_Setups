#!/bin/bash

# ===============================
# SYSTEM DIAGNOSTIC TOOLKIT v2.0
# Author: DevOps/Cloud Edition
# ===============================

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

section() {
    echo -e "\n${CYAN}========== $1 ==========${NC}"
}

subsection() {
    echo -e "\n${YELLOW}$1:${NC}"
}

header() {
    echo -e "${CYAN}=========== SYSTEM HEALTH SUMMARY ===========${NC}"
}

footer() {
    echo -e "\n${CYAN}=========== END OF REPORT ===========${NC}"
}

header

# --- BASIC SYSTEM INFO ---
section "BASIC SYSTEM INFO"
echo -e "${CYAN}Hostname:${NC} $(hostname)"
echo -e "${CYAN}Uptime:${NC} $(uptime -p)"
echo -e "${CYAN}Kernel:${NC} $(uname -r)"
echo -e "${CYAN}OS:${NC} $(grep -E '^PRETTY_NAME' /etc/os-release | cut -d= -f2- | tr -d \")"
echo -e "${CYAN}Architecture:${NC} $(uname -m)"

# --- REBOOT & PATCHING ---
section "LAST REBOOT & PATCH HISTORY"
subsection "Last Reboot"
who -b

subsection "Last Patching"
if command -v rpm &> /dev/null; then
    rpm -qa --last | head -n 5
elif command -v dpkg &> /dev/null; then
    grep " install " /var/log/dpkg.log | tail -n 5
fi

# --- LOAD & RESOURCE STATS ---
section "SYSTEM LOAD AND RESOURCES"
subsection "Load Average"
uptime

subsection "Top Memory Consumers"
ps aux --sort=-%mem | awk 'NR<=3{print $0}'

subsection "Top CPU Consumers"
ps aux --sort=-%cpu | awk 'NR<=3{print $0}'

subsection "Zombie Processes"
ps aux | awk '$8=="Z" {print $0}'

subsection "Processes >500MB RAM"
ps aux --sort=-rss | awk '$6 > 512000 {print $0}' | head -n 5

# --- MEMORY & DISK ---
section "MEMORY AND DISK"
subsection "Memory Info"
free -h

subsection "Disk Usage"
df -h --total | grep -E 'Filesystem|total'

# --- SERVICES AND ERRORS ---
section "SYSTEM ERRORS AND SERVICES"
subsection "Failed Systemd Services"
systemctl --failed

subsection "Critical System Logs (journalctl)"
journalctl -p 3 -xb | tail -n 10

# --- NETWORK ---
section "NETWORK"
subsection "Private IPs"
hostname -I

subsection "Public IP"
curl -s ifconfig.me

subsection "Open TCP Ports"
ss -tuln | grep -i LISTEN

subsection "Established Connections"
ss -s

# --- FIREWALL & SECURITY ---
section "SECURITY SETTINGS"
subsection "Firewall Status"
if command -v ufw &> /dev/null; then
    ufw status
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --state
fi

subsection "SELinux Status"
sestatus 2>/dev/null || echo "SELinux not installed"

# --- KERNEL & TEMP ---
section "KERNEL & HARDWARE"
subsection "CPU Temperature (if sensors installed)"
command -v sensors &>/dev/null && sensors || echo "sensors not available"

# --- BLOCK DEVICES ---
section "BLOCK DEVICES"
lsblk

# --- USERS ---
section "USER SESSIONS"
who

# --- PACKAGE & UPDATE STATUS ---
section "UPDATES AND PACKAGE STATUS"
if command -v apt &> /dev/null; then
    apt list --upgradable 2>/dev/null | tail -n +2
    subsection "Broken Packages"
    dpkg -l | grep ^..r
elif command -v yum &> /dev/null || command -v dnf &> /dev/null; then
    yum check-update || dnf check-update
fi

# --- CLOUD SPECIFIC (Optional) ---
section "CLOUD CHECKS"
if command -v aws &> /dev/null; then
    subsection "AWS Identity (if configured)"
    aws sts get-caller-identity 2>/dev/null || echo "Not configured"
fi

# --- DOCKER / K8s CHECKS ---
section "CONTAINER & K8s HEALTH"
if command -v docker &> /dev/null; then
    subsection "Docker Info"
    docker info --format '{{.ID}}: {{.ServerVersion}}' 2>/dev/null
    docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Status}}" | head -n 5
fi

if command -v kubectl &> /dev/null; then
    subsection "Kubernetes Nodes"
    kubectl get nodes
    subsection "Pods in All Namespaces"
    kubectl get pods --all-namespaces | head -n 5
fi

footer