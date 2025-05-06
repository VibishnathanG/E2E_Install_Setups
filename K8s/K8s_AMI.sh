#!/bin/bash

set -e

echo "[Step 1] Update system and install dependencies"
yum update -y
yum install -y iproute-tc containerd curl vim wget git

echo "[Step 2] Set hostname resolution locally"
echo "127.0.0.1 $(hostname)" >> /etc/hosts

echo "[Step 3] Configure containerd"
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
systemctl enable containerd
systemctl restart containerd
systemctl status containerd --no-pager

echo "[Step 4] Configure sysctl for Kubernetes networking"
cat <<EOF | tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

modprobe br_netfilter
sysctl --system

echo "[Step 5] Disable swap and configure SELinux"
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

setenforce 0
sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config

echo "[Step 6] Add Kubernetes repo and install kubelet, kubeadm, kubectl"
cat <<EOF | tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/v1.30/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/v1.30/rpm/repodata/repomd.xml.key
exclude=kubelet kubeadm kubectl cri-tools kubernetes-cni
EOF

yum install -y kubelet-1.30.1 kubeadm-1.30.1 kubectl-1.30.1 --disableexcludes=kubernetes
systemctl enable --now kubelet

echo "[Step 7] Initialize Kubernetes cluster (master node)"
kubeadm init --pod-network-cidr=10.244.0.0/16 --kubernetes-version=1.30.1 --ignore-preflight-errors=all

echo "[Step 8] Configure kubectl for current user"
export KUBECONFIG=/etc/kubernetes/admin.conf
mkdir -p $HOME/.kube
cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
chown $(id -u):$(id -g) $HOME/.kube/config

echo "[Step 9] Install Calico for networking"
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.2/manifests/tigera-operator.yaml
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.27.2/manifests/custom-resources.yaml
sed -i -e 's/192.168.0.0/10.244.0.0/g' custom-resources.yaml
kubectl create -f custom-resources.yaml

echo "[Step 10] Print cluster join command"
kubeadm token create --print-join-command

echo "[Step 11] Kubernetes master setup complete!"
