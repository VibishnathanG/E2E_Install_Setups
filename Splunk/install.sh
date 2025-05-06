#!/bin/bash
# docker run -d \
#   --name splunk \
#   -p 8000:8000 -p 8089:8089 \
#   -e SPLUNK_START_ARGS="--accept-license" \
#   -e SPLUNK_PASSWORD="MySecurePassword123" \
#   splunk/splunk:latest

#above is for Docker
#!/bin/bash

# Variables
SPLUNK_VERSION="9.4.1"
SPLUNK_BUILD="e3bdab203ac8"
SPLUNK_TGZ="splunk-${SPLUNK_VERSION}-${SPLUNK_BUILD}-linux-amd64.tgz"
SPLUNK_URL="https://download.splunk.com/products/splunk/releases/${SPLUNK_VERSION}/linux/${SPLUNK_TGZ}"
INSTALL_DIR="/opt"
SPLUNK_HOME="${INSTALL_DIR}/splunk"
SPLUNK_USER="splunk"

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script as root."
    exit 1
fi

# 1. Download Splunk
echo "Downloading Splunk..."
if ! wget -O ${SPLUNK_TGZ} "${SPLUNK_URL}"; then
    echo "Failed to download Splunk. Exiting."
    exit 1
fi

# 2. Extract to /opt
echo "Extracting Splunk to ${INSTALL_DIR}..."
if ! tar -xvzf ${SPLUNK_TGZ} -C ${INSTALL_DIR}; then
    echo "Failed to extract Splunk. Exiting."
    exit 1
fi

# 3. Create splunk user if not exists
if ! id -u ${SPLUNK_USER} >/dev/null 2>&1; then
    echo "Creating user ${SPLUNK_USER}..."
    if ! useradd --system --create-home --shell /bin/bash ${SPLUNK_USER}; then
        echo "Failed to create user ${SPLUNK_USER}. Exiting."
        exit 1
    fi
fi

# 4. Set ownership
echo "Setting ownership to ${SPLUNK_USER}..."
if ! chown -R ${SPLUNK_USER}:${SPLUNK_USER} ${SPLUNK_HOME}; then
    echo "Failed to set ownership. Exiting."
    exit 1
fi

# 5. Accept license and enable boot-start as splunk user
echo "Enabling Splunk boot-start with license acceptance..."
if ! sudo -u ${SPLUNK_USER} ${SPLUNK_HOME}/bin/splunk start --accept-license --answer-yes --no-prompt; then
    echo "Failed to start Splunk for license acceptance. Exiting."
    exit 1
fi

# 6. Stop Splunk before enabling systemd service
echo "Stopping Splunk for systemd setup..."
if ! sudo -u ${SPLUNK_USER} ${SPLUNK_HOME}/bin/splunk stop; then
    echo "Failed to stop Splunk. Exiting."
    exit 1
fi

# 7. Create systemd unit file
echo "Creating systemd service file..."
cat <<EOF > /etc/systemd/system/splunk.service
[Unit]
Description=Splunk Enterprise
After=network.target

[Service]
Type=forking
User=${SPLUNK_USER}
Group=${SPLUNK_USER}
ExecStart=${SPLUNK_HOME}/bin/splunk start
ExecStop=${SPLUNK_HOME}/bin/splunk stop
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 8. Reload systemd, enable and start Splunk
echo "Enabling and starting Splunk service..."
if ! systemctl daemon-reexec; then
    echo "Failed to re-exec systemd. Exiting."
    exit 1
fi

if ! systemctl daemon-reload; then
    echo "Failed to reload systemd. Exiting."
    exit 1
fi

if ! systemctl enable splunk; then
    echo "Failed to enable Splunk service. Exiting."
    exit 1
fi

if ! systemctl start splunk; then
    echo "Failed to start Splunk service. Exiting."
    exit 1
fi

# 9. Check service status
echo "Splunk service status:"
if ! systemctl is-active --quiet splunk; then
    echo "Splunk service failed to start. Check logs for details."
    exit 1
else
    echo "Splunk service is running successfully."
fi

# 10. Cleanup temporary files
echo "Cleaning up temporary files..."
rm -f ${SPLUNK_TGZ}