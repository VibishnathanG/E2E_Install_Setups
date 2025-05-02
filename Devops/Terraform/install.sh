#!/bin/bash
# Install Terraform

TERRAFORM_VERSION="1.7.5"
cd /usr/local/bin
wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip
rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip

echo "Terraform installed successfully."
