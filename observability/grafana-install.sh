# Install Grafana
echo "Installing Grafana..."
cat <<EOF > /etc/yum.repos.d/grafana.repo
[grafana]
name=Grafana YUM repo
baseurl=https://packages.grafana.com/oss/rpm
repo_gpgcheck=1
enabled=1
gpgcheck=1
gpgkey=https://packages.grafana.com/gpg.key
EOF

yum install -y grafana
systemctl start grafana
# systemctl enable --now grafana-server

echo "✅ Grafana  installed and running."
