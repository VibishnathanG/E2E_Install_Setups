#!/bin/bash

# Install Prometheus
echo "Installing Prometheus..."
useradd --no-create-home --shell /bin/false prometheus
mkdir /etc/prometheus /var/lib/prometheus
cd /tmp
curl -s https://api.github.com/repos/prometheus/prometheus/releases/latest \
| grep browser_download_url \
| grep linux-amd64.tar.gz \
| cut -d '"' -f 4 \
| wget -qi -
tar -xvf prometheus-*
cd prometheus-*
cp prometheus promtool /usr/local/bin/
cp -r consoles console_libraries /etc/prometheus/
cp prometheus.yml /etc/prometheus/

# Setup Prometheus systemd
cat <<EOF > /etc/systemd/system/prometheus.service
[Unit]
Description=Prometheus
After=network.target

[Service]
User=prometheus
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/

[Install]
WantedBy=default.target
EOF

chown -R prometheus: /etc/prometheus /var/lib/prometheus
systemctl daemon-reexec
systemctl daemon-reload
systemctl start prometheus
#systemctl enable --now prometheus



echo "✅ Prometheus  installed and running."
