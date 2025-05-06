#!/bin/bash
# Install Docker on Amazon Linux

sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

echo "Docker installed successfully. Log out and log in again to use Docker without sudo."
