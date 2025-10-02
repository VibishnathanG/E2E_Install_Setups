provider "aws" {
  region = "us-east-1"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = {
    Name = "k8s-vpc"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "k8s-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "us-east-1a"
  tags = {
    Name = "k8s-subnet"
  }
}

resource "aws_route_table" "rt" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = {
    Name = "k8s-rt"
  }
}

resource "aws_route_table_association" "assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.rt.id
}

# Security Group
resource "aws_security_group" "k8s_sg" {
  name        = "k8s-sg"
  vpc_id      = aws_vpc.main.id
  description = "Allow SSH"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "k8s-security"
  }
}

# EBS Volume
resource "aws_ebs_volume" "persistent_volume" {
  availability_zone = "us-east-1a"
  size              = 12
  type              = "gp3"
  tags = {
    Name = "k8s-persistent-ebs"
  }
}

# EC2 Spot Instance
resource "aws_instance" "k8s_instance" {
  ami                    = "ami-0c101f26f147fa7fd" # Amazon Linux 2023 (us-east-1)
  instance_type          = "t3.xlarge"
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  associate_public_ip_address = true
  security_groups        = [aws_security_group.k8s_sg.id]

  instance_market_options {
    market_type = "spot"
    spot_options {
      max_price                     = "0.035"
      spot_instance_type            = "one-time"
      instance_interruption_behavior = "terminate"
    }
  }

  root_block_device {
    volume_size = 10
    volume_type = "gp3"
    delete_on_termination = true
  }

  user_data = <<-EOF
              #!/bin/bash
              yum update -y

              # Mount EBS
              mkfs -t ext4 /dev/xvdf || true
              mkdir -p /mnt/data
              mount /dev/xvdf /mnt/data
              echo "/dev/xvdf /mnt/data ext4 defaults,nofail 0 2" >> /etc/fstab

              # Create mount points
              mkdir -p /mnt/data/home
              mkdir -p /mnt/data/kubelet
              mkdir -p /mnt/data/containerd

              # Bind mounts
              mount --bind /mnt/data/home /home/ec2-user
              echo "/mnt/data/home /home/ec2-user none bind 0 0" >> /etc/fstab

              mount --bind /mnt/data/kubelet /var/lib/kubelet
              echo "/mnt/data/kubelet /var/lib/kubelet none bind 0 0" >> /etc/fstab

              mount --bind /mnt/data/containerd /var/lib/containerd
              echo "/mnt/data/containerd /var/lib/containerd none bind 0 0" >> /etc/fstab

              chown -R ec2-user:ec2-user /mnt/data/home

              # Install Kubernetes
              cat <<EOT >> /etc/yum.repos.d/kubernetes.repo
              [kubernetes]
              name=Kubernetes
              baseurl=https://packages.cloud.google.com/yum/repos/kubernetes-el7-x86_64
              enabled=1
              gpgcheck=1
              repo_gpgcheck=1
              gpgkey=https://packages.cloud.google.com/yum/doc/yum-key.gpg
                     https://packages.cloud.google.com/yum/doc/rpm-package-key.gpg
              EOT

              yum install -y kubelet kubeadm kubectl --disableexcludes=kubernetes
              systemctl enable kubelet
              EOF

  tags = {
    Name = "k8s-spot-node"
  }
}

# Attach EBS Volume
resource "aws_volume_attachment" "ebs_attach" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.persistent_volume.id
  instance_id = aws_instance.k8s_instance.id
  force_detach = true
}
