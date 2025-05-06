#!/bin/bash

# Update system
yum update -y  # For Amazon Linux
# apt-get update -y && apt-get upgrade -y  # Use this instead for Ubuntu

# Install git if not present
command -v git >/dev/null 2>&1 || yum install -y git  # Amazon Linux

# Clone the repo to /root directory
cd /
git clone https://github.com/VibishnathanG/E2E_Install_Setups.git

