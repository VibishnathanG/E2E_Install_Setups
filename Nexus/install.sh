#!/bin/bash

# Exit on any error
set -e

# Variables
NEXUS_VERSION=latest-unix
NEXUS_USER=nexus
INSTALL_DIR=/opt
NEXUS_DIR=${INSTALL_DIR}/nexus
NEXUS_DOWNLOAD_URL="https://download.sonatype.com/nexus/3/${NEXUS_VERSION}.tar.gz"

# 1. Install Java
echo "[*] Installing Java..."
yum install -y java-1.8.0-openjdk

# 2. Create nexus user
echo "[*] Creating Nexus user..."
useradd -r -m -d /opt/nexus -s /bin/bash $NEXUS_USER || true

# 3. Download and extract Nexus
cd $INSTALL_DIR
echo "[*] Downloading Nexus..."
curl -LO $NEXUS_DOWNLOAD_URL

echo "[*] Extracting Nexus..."
tar -xvzf ${NEXUS_VERSION}.tar.gz
mv nexus-3* nexus
chown -R $NEXUS_USER:$NEXUS_USER nexus
chown -R $NEXUS_USER:$NEXUS_USER sonatype-work

# 4. Configure run_as_user
echo '[*] Configuring run_as_user...'
echo 'run_as_user="nexus"' > $NEXUS_DIR/bin/nexus.rc

# 5. Create systemd service
echo '[*] Creating systemd service...'
cat <<EOF | tee /etc/systemd/system/nexus.service
[Unit]
Description=nexus service
After=network.target

[Service]
Type=forking
LimitNOFILE=65536
ExecStart=$NEXUS_DIR/bin/nexus start
ExecStop=$NEXUS_DIR/bin/nexus stop
User=$NEXUS_USER
Restart=on-abort

[Install]
WantedBy=multi-user.target
EOF

# 6. Enable firewall port 8081
echo "[*] Opening port 8081..."
firewall-cmd --permanent --add-port=8081/tcp || true
firewall-cmd --reload || true

# 7. Enable and start service
echo "[*] Starting Nexus service..."
systemctl daemon-reload
systemctl enable nexus
systemctl start nexus

echo "✅ Nexus Repository OSS is running at: http://<your-server-ip>:8081"
