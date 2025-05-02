#!/bin/bash
# Install Java, configure system and install SonarQube

# Install Java
yum install -y java-17-openjdk-devel

# Create sonar user
useradd -r -s /bin/false sonar

# Download and extract SonarQube
cd /opt
wget https://binaries.sonarsource.com/Distribution/sonarqube/sonarqube-25.4.0.105899.zip
unzip sonarqube-25.4.0.105899.zip
mv sonarqube-25.4.0.105899 sonarqube
chown -R sonar:sonar /opt/sonarqube

# System settings
echo "vm.max_map_count=262144" >> /etc/sysctl.conf
echo "fs.file-max=65536" >> /etc/sysctl.conf
sysctl -p

# Limits config
echo "sonar   -   nofile   65536" >> /etc/security/limits.conf
echo "sonar   -   nproc    4096" >> /etc/security/limits.conf

# Update SonarQube DB configs
cat <<EOF > /opt/sonarqube/conf/sonar.properties
sonar.jdbc.username=sonar
sonar.jdbc.password=admin
sonar.jdbc.url=jdbc:postgresql://localhost/sonarqube
sonar.web.host=0.0.0.0
EOF

# Create systemd service
cat <<EOF > /etc/systemd/system/sonarqube.service
[Unit]
Description=SonarQube service
After=syslog.target network.target

[Service]
Type=forking
ExecStart=/opt/sonarqube/bin/linux-x86-64/sonar.sh start
ExecStop=/opt/sonarqube/bin/linux-x86-64/sonar.sh stop
User=sonar
Group=sonar
Restart=on-failure
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Start SonarQube
systemctl daemon-reload
systemctl enable --now sonarqube
