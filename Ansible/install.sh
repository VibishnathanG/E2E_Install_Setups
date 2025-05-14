#!/bin/bash
# Update system packages
sudo yum update -y

# Install Python and pip
sudo yum install -y python3 python3-pip

# Install Ansible using pip
pip3 install ansible

# Verify Ansible installation
ansible --version
