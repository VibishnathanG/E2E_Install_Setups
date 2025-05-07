#!/bin/bash

# Install Trivy on a system using yum
echo "Installing Trivy..."
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://aquasecurity.github.io/trivy-repo/rpm/releases/x86_64/
sudo rpm --import https://aquasecurity.github.io/trivy-repo/rpm/public.key
sudo yum install -y trivy

# Verify Trivy installation
trivy --version