#!/bin/bash
# Install Maven on Amazon Linux

MAVEN_VERSION=3.9.6
cd /opt
wget https://downloads.apache.org/maven/maven-3/${MAVEN_VERSION}/binaries/apache-maven-${MAVEN_VERSION}-bin.tar.gz
tar -xvzf apache-maven-${MAVEN_VERSION}-bin.tar.gz
mv apache-maven-${MAVEN_VERSION} maven
ln -s /opt/maven/bin/mvn /usr/bin/mvn

cat <<EOF | sudo tee /etc/profile.d/maven.sh
export M2_HOME=/opt/maven
export PATH=\$M2_HOME/bin:\$PATH
EOF

chmod +x /etc/profile.d/maven.sh
source /etc/profile.d/maven.sh

echo "Maven installed successfully."
