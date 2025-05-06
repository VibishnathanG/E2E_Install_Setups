#!/bin/bash
# User Data Script for Jenkins Installation on Linux AMI

# Update the system
echo "Updating the system..."
sudo yum update -y

# Install Java (required for Jenkins)
echo "Installing Java..."
sudo amazon-linux-extras enable corretto8
sudo yum install -y java-1.8.0-amazon-corretto

# Add Jenkins repository and import the GPG key
echo "Adding Jenkins repository..."
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key

# Install Jenkins
echo "Installing Jenkins..."
sudo yum install -y jenkins

# Start and enable Jenkins service
echo "Starting and enabling Jenkins service..."
sudo systemctl start jenkins
#sudo systemctl enable jenkins

# Adjust firewall rules to allow Jenkins traffic (port 8080)
echo "Configuring firewall for Jenkins..."
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload

# Print Jenkins initial admin password
echo "Jenkins installation complete. Initial admin password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword