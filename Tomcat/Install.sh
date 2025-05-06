#!/bin/bash

# Exit on error
set -e

# Variables
TOMCAT_VERSION="10.1.9"
TOMCAT_USER="admin"
TOMCAT_PASS="vibishnathan"
TOMCAT_HOME="/opt/tomcat"
TOMCAT_TARBALL="apache-tomcat-${TOMCAT_VERSION}.tar.gz"
TOMCAT_DIR="apache-tomcat-${TOMCAT_VERSION}"

echo "==> Installing Java..."
sudo amazon-linux-extras install java-openjdk11 -y

echo "==> Creating tomcat user..."
sudo useradd -m -U -d $TOMCAT_HOME -s /bin/false $TOMCAT_USER

echo "==> Downloading Tomcat ${TOMCAT_VERSION}..."
cd /opt
sudo wget https://dlcdn.apache.org/tomcat/tomcat-10/v${TOMCAT_VERSION}/bin/${TOMCAT_TARBALL}
sudo tar -xvzf ${TOMCAT_TARBALL}
sudo mv ${TOMCAT_DIR} tomcat
sudo chown -R $TOMCAT_USER:$TOMCAT_USER $TOMCAT_HOME

echo "==> Configuring tomcat-users.xml..."
sudo tee $TOMCAT_HOME/conf/tomcat-users.xml > /dev/null <<EOF
<tomcat-users>
    <user username="${TOMCAT_USER}" password="${TOMCAT_PASS}" roles="manager-gui,manager-script,manager-jmx,manager-status"/>
</tomcat-users>
EOF

echo "==> Commenting restrictive <Valve> tags in context.xml files..."
for FILE in $TOMCAT_HOME/webapps/*/META-INF/context.xml; do
  sudo sed -i 's/<Valve/<\!--Valve/g' $FILE
  sudo sed -i 's@/>@/-->@g' $FILE
done

echo "==> Adding execute permissions to scripts..."
sudo chmod +x $TOMCAT_HOME/bin/*.sh

echo "==> Creating symlinks for easy startup/shutdown..."
sudo ln -sf $TOMCAT_HOME/bin/startup.sh /usr/local/bin/tomcatup
sudo ln -sf $TOMCAT_HOME/bin/shutdown.sh /usr/local/bin/tomcatdown

echo "==> Starting Tomcat..."
sudo -u $TOMCAT_USER $TOMCAT_HOME/bin/startup.sh

echo "==> Installation complete!"
echo "Access Tomcat via: http://<your-ec2-public-ip>:8080"
echo "Login with: username=$TOMCAT_USER, password=$TOMCAT_PASS"
