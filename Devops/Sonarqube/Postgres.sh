#!/bin/bash
# Setup PostgreSQL and configure pg_hba.conf for SonarQube

# Install PostgreSQL if not already installed
yum install -y postgresql-server postgresql-contrib

# Initialize DB and start service
postgresql-setup --initdb
systemctl enable --now postgresql

# Update authentication method to md5
PG_HBA="/var/lib/pgsql/data/pg_hba.conf"
sed -i 's/^\(local\s\+all\s\+all\s\+\)ident/\1md5/' "$PG_HBA"

# Restart PostgreSQL to apply changes
systemctl restart postgresql

# Set postgres user password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create sonar user and DB
sudo -u postgres psql <<EOF
CREATE USER sonar WITH PASSWORD 'admin';
CREATE DATABASE sonarqube OWNER sonar;
GRANT ALL PRIVILEGES ON DATABASE sonarqube TO sonar;
EOF
