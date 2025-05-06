# 📦 DevOps Tools Installation Reference Guide

This guide provides direct download links and standard installation commands for commonly used DevOps tools on **Amazon Linux**.

---

## 📋 Tools and Installation Methods

| Tool                       | Official Download Page                                                                                                        | Direct Download Link                                                                                                                                                 | Installation Command (wget/curl/yum/pip)                                                                                          |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| **Docker**                | [docs.docker.com](https://docs.docker.com/engine/install/)                                                                    | Installed via YUM                                                                                                              | `sudo yum install -y docker`                                                                                                      |
| **Maven**                 | [maven.apache.org](https://maven.apache.org/download.cgi)                                                                      | [apache-maven-3.9.6-bin.tar.gz](https://downloads.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz)       | `wget https://downloads.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz`                                   |
| **Jenkins**               | [jenkins.io](https://www.jenkins.io/download/)                                                                                 | [jenkins.repo](https://pkg.jenkins.io/redhat-stable/jenkins.repo) <br> [jenkins.io-2023.key](https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key) | `wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo`<br>`rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key` |
| **Terraform**             | [terraform.io](https://developer.hashicorp.com/terraform/downloads)                                                            | [hashicorp.repo](https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo)                                               | `sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo`                               |
| **Ansible**               | [docs.ansible.com](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)                        | Installed via `pip3`                                                                                                           | `pip3 install ansible`                                                                                                            |
| **Tomcat 10**             | [tomcat.apache.org](https://tomcat.apache.org/download-10.cgi)                                                                 | [apache-tomcat-10.1.9.tar.gz](https://dlcdn.apache.org/tomcat/tomcat-10/v10.1.9/bin/apache-tomcat-10.1.9.tar.gz)               | `wget https://dlcdn.apache.org/tomcat/tomcat-10/v10.1.9/bin/apache-tomcat-10.1.9.tar.gz`                                          |
| **Java 11 (Amazon Linux)**| [corretto 11](https://docs.aws.amazon.com/corretto/latest/corretto-11-ug/)                                                     | Installed via amazon-linux-extras                                                                                              | `sudo amazon-linux-extras install java-openjdk11 -y`                                                                              |
| **Java 18 (Amazon Linux)**| [corretto 18](https://docs.aws.amazon.com/corretto/latest/corretto-18-ug/)                                                     | Installed via yum                                                                                                              | `sudo yum install -y java-18-amazon-corretto`                                                                                     |
| **SonarQube**             | [sonarsource.com](https://www.sonarsource.com/products/sonarqube/downloads/)                                                   | [sonarqube-2025.1.zip](https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-2025.1.zip)                           | `wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-2025.1.zip`                                               |
| **Nexus Repository OSS**  | [sonatype.com](https://www.sonatype.com/products/sonatype-nexus-oss-download)                                                  | [nexus-3.79.1-01-unix.tar.gz](https://download.sonatype.com/nexus/3/nexus-3.79.1-01-unix.tar.gz)                               | `wget https://download.sonatype.com/nexus/3/nexus-3.79.1-01-unix.tar.gz`                                                          |
| **JFrog Artifactory OSS** | [jfrog.com](https://jfrog.com/community/download-artifactory-oss/)                                                             | [artifactory-oss-7.77.3-linux.tar.gz](https://releases.jfrog.io/artifactory/artifactory-oss-7.77.3-linux.tar.gz)               | `wget https://releases.jfrog.io/artifactory/artifactory-oss-7.77.3-linux.tar.gz`                                                  |
| **Splunk Enterprise**     | [splunk.com](https://www.splunk.com/en_us/download.html)                                                                       | [splunk-9.1.2.rpm](https://download.splunk.com/products/splunk/releases/9.1.2/linux/splunk-9.1.2-123456-linux-2.6-x86_64.rpm)  | `wget https://download.splunk.com/products/splunk/releases/9.1.2/linux/splunk-9.1.2-123456-linux-2.6-x86_64.rpm`                  |
| **Trivy**                 | [trivy.dev](https://trivy.dev/)                                                                                                | [trivy_0.62.0.tar.gz](https://github.com/aquasecurity/trivy/releases/download/v0.62.0/trivy_0.62.0_Linux-64bit.tar.gz)         | `wget https://github.com/aquasecurity/trivy/releases/download/v0.62.0/trivy_0.62.0_Linux-64bit.tar.gz`                           |

---

## ✅ Notes

- Use `sudo` where necessary, especially for system-level installs.
- For tools like Maven and Tomcat, don’t forget to extract, set environment variables, and optionally create symlinks.
- Jenkins requires Java (Java 11 or Java 18 preferred).
- Always validate the latest versions from the official download pages if you’re automating installation scripts.

---

> *Note: The direct download links are based on the latest available versions as of **May 2025**. Please verify versions from official sites if required.*
