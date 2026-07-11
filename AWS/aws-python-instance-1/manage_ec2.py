#!/usr/bin/env python3
"""
EC2 lifecycle + instance type manager

Guarantees:
- --start / upgrade / downgrade:
  - auto-stop after 120 minutes by default
  - --duration-minutes overrides
  - --duration-minutes 0 => infinite
- Ctrl+C during timer ALWAYS stops the instance
- stop / status are never timed
- --cost is standalone and billing-safe
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Optional
import os
import re

import boto3
from botocore.exceptions import ClientError

# -------------------- Constants --------------------

DEFAULT_REGION = "us-east-1"

DEFAULT_UP_TYPE = "t3a.xlarge"
DEFAULT_DOWN_TYPE = "t3a.medium"

DEFAULT_START_DURATION_MIN = 120

PUBLIC_IP_WAIT_SEC = 180
POLL_INTERVAL = 5

# SSH config file path
SSH_CONFIG_PATH = "/mnt/c/Users/vibis/.ssh/config"

# -------------------- AWS Helpers --------------------

def session_client(region: Optional[str]):
    return boto3.Session(region_name=region or DEFAULT_REGION).client("ec2")

def describe_instance(ec2, instance_id: str):
    resp = ec2.describe_instances(InstanceIds=[instance_id])
    try:
        return resp["Reservations"][0]["Instances"][0]
    except (KeyError, IndexError):
        raise RuntimeError("Instance not found")

def wait_for_state(ec2, instance_id: str, waiter_name: str):
    ec2.get_waiter(waiter_name).wait(InstanceIds=[instance_id])

# -------------------- SSH Config Update --------------------

def update_ssh_config(public_ip: str):
    """Update the SSH config file with the new public IP for Main-Server-US host"""
    if not os.path.exists(SSH_CONFIG_PATH):
        print(f"SSH config file not found at {SSH_CONFIG_PATH}")
        return
    
    try:
        with open(SSH_CONFIG_PATH, 'r') as f:
            content = f.read()
        
        # Pattern to match the Main-Server-US host block and its HostName line
        pattern = r'(Host Main-Server-US\s+)(HostName\s+)([^\s]+)'
        replacement = r'\1\g<2>' + public_ip
        
        updated_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        
        with open(SSH_CONFIG_PATH, 'w') as f:
            f.write(updated_content)
        
        print(f"Updated SSH config: Main-Server-US HostName -> {public_ip}")
        
    except Exception as e:
        print(f"Failed to update SSH config: {e}")

# -------------------- Instance Ops --------------------

def stop_instance(ec2, instance_id: str):
    state = describe_instance(ec2, instance_id)["State"]["Name"]
    if state in ("stopped", "stopping"):
        return
    ec2.stop_instances(InstanceIds=[instance_id])
    wait_for_state(ec2, instance_id, "instance_stopped")

def start_instance(ec2, instance_id: str):
    state = describe_instance(ec2, instance_id)["State"]["Name"]
    if state in ("running", "pending"):
        return
    ec2.start_instances(InstanceIds=[instance_id])
    wait_for_state(ec2, instance_id, "instance_running")

def modify_instance_type(ec2, instance_id: str, instance_type: str):
    ec2.modify_instance_attribute(
        InstanceId=instance_id,
        InstanceType={"Value": instance_type},
    )

def wait_for_public_ip(ec2, instance_id: str) -> Optional[str]:
    waited = 0
    while waited < PUBLIC_IP_WAIT_SEC:
        ip = describe_instance(ec2, instance_id).get("PublicIpAddress")
        if ip:
            return ip
        time.sleep(POLL_INTERVAL)
        waited += POLL_INTERVAL
    return describe_instance(ec2, instance_id).get("PublicIpAddress")

# -------------------- Timer --------------------

def apply_start_timer(ec2, instance_id: str, duration_minutes: int):
    if duration_minutes == 0:
        print("Auto-stop disabled (infinite run). Ctrl+C will stop instance.")
        try:
            while True:
                time.sleep(3600)
        except KeyboardInterrupt:
            print("\nCtrl+C detected. Stopping instance.")
            stop_instance(ec2, instance_id)
            print("Instance stopped.")
        return

    print(f"Auto-stop scheduled in {duration_minutes} minute(s). Ctrl+C will stop instance.")
    try:
        for remaining in range(duration_minutes, 0, -1):
            print(f"Time remaining: {remaining} minute(s)...", end="\r")
            time.sleep(60)
        print("\nTimer expired. Stopping instance.")
        stop_instance(ec2, instance_id)
        print("Instance stopped.")
    except KeyboardInterrupt:
        print("\nCtrl+C detected. Stopping instance.")
        stop_instance(ec2, instance_id)
        print("Instance stopped.")

# -------------------- Composite Ops --------------------

def change_type_and_start(ec2, instance_id: str, target_type: str, assume_yes: bool):
    inst = describe_instance(ec2, instance_id)
    current_type = inst["InstanceType"]
    state = inst["State"]["Name"]

    if state == "terminated":
        raise RuntimeError("Instance is terminated")

    if current_type != target_type:
        if not assume_yes:
            input(
                f"Change instance {instance_id} "
                f"{current_type} -> {target_type}? "
                f"[Enter=continue / Ctrl-C=abort] "
            )
        else:
            print(f"Auto-confirmed type change: {current_type} -> {target_type}")

        if state != "stopped":
            stop_instance(ec2, instance_id)

        modify_instance_type(ec2, instance_id, target_type)

    start_instance(ec2, instance_id)
    ip = wait_for_public_ip(ec2, instance_id)
    print(f"Instance running. Public IP: {ip or 'N/A'}")
    
    # Update SSH config with new public IP
    if ip:
        update_ssh_config(ip)

# -------------------- CLI --------------------

def parse_args():
    examples = """
Examples:
  # Check instance status
  manage_ec2.py i-0123456789abcdef0 --action status

  # Start instance (auto-stop after 120 minutes)
  manage_ec2.py i-0123456789abcdef0 --start

  # Start instance and run indefinitely
  manage_ec2.py i-0123456789abcdef0 --start --duration-minutes 0

  # Upgrade instance type (default t3a.xlarge)
  manage_ec2.py i-0123456789abcdef0 --action upgrade --yes

  # Upgrade with explicit instance type
  manage_ec2.py i-0123456789abcdef0 --action upgrade --instance-type t4.medium --yes

  # Downgrade instance type
  manage_ec2.py i-0123456789abcdef0 --action downgrade

  # Stop instance immediately
  manage_ec2.py i-0123456789abcdef0 --stop

  # Run in background for 120 minutes (nohup)
  nohup manage_ec2.py i-0123456789abcdef0 --start > manage_ec2.log 2>&1 &
"""

    p = argparse.ArgumentParser(
        description="EC2 lifecycle and instance type manager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=examples,
    )

    p.add_argument("instance_id", nargs="?")
    p.add_argument("--region", default=DEFAULT_REGION)

    group = p.add_mutually_exclusive_group()
    group.add_argument("--action", choices=("upgrade", "downgrade", "status", "start", "stop"))
    group.add_argument("--start", dest="action", action="store_const", const="start")
    group.add_argument("--stop", dest="action", action="store_const", const="stop")

    p.add_argument("--instance-type", help="Override instance type (upgrade/downgrade only)")
    p.add_argument("--yes", action="store_true")

    p.add_argument(
        "--duration-minutes",
        type=int,
        default=DEFAULT_START_DURATION_MIN,
        help="Auto-stop timer for start paths. 0 = infinite.",
    )

    # cost functionality removed

    return p.parse_args()

# -------------------- Main --------------------

def main():
    args = parse_args()

    # cost functionality removed

    if not args.instance_id:
        print("Error: instance_id is required", file=sys.stderr)
        sys.exit(2)

    ec2 = session_client(args.region)
    iid = args.instance_id

    try:
        if args.action == "stop":
            stop_instance(ec2, iid)
            print("Instance stopped.")
            return

        if args.action == "status":
            inst = describe_instance(ec2, iid)
            print(f"InstanceId: {inst['InstanceId']}")
            print(f"State: {inst['State']['Name']}")
            print(f"Type: {inst['InstanceType']}")
            print(f"AZ: {inst['Placement']['AvailabilityZone']}")
            print(f"PublicIp: {inst.get('PublicIpAddress')}")
            print(f"PrivateIp: {inst.get('PrivateIpAddress')}")
            return

        if args.action == "start":
            start_instance(ec2, iid)
            ip = wait_for_public_ip(ec2, iid)
            print(f"Instance running. Public IP: {ip or 'N/A'}")
            # Update SSH config with new public IP
            if ip:
                update_ssh_config(ip)
            apply_start_timer(ec2, iid, args.duration_minutes)
            return

        if args.action in ("upgrade", "downgrade"):
            target = (
                args.instance_type
                if args.instance_type
                else DEFAULT_UP_TYPE if args.action == "upgrade"
                else DEFAULT_DOWN_TYPE
            )
            change_type_and_start(ec2, iid, target, args.yes)
            apply_start_timer(ec2, iid, args.duration_minutes)
            return

    except ClientError as e:
        print("AWS error:", e, file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print("Error:", e, file=sys.stderr)
        sys.exit(3)

if __name__ == "__main__":
    main()
