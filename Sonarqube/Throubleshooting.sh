#!/bin/bash
# Basic validation & troubleshooting for SonarQube & DB

echo "Checking Java version..."
java -version

echo "Testing PostgreSQL connection for sonar user..."
PGPASSWORD=admin psql -U sonar -d sonarqube -h 127.0.0.1 -c "\q"
if [ $? -eq 0 ]; then
    echo "PostgreSQL connection successful"
else
    echo "PostgreSQL connection failed. Please check pg_hba.conf and credentials."
fi

echo "Restarting PostgreSQL service..."
systemctl restart postgresql

echo "Restarting SonarQube service..."
systemctl restart sonarqube

echo "SonarQube should be accessible at http://<server-ip>:9000"
