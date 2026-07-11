# aws-python-instance-1

Lightweight CLI helpers to manage an EC2 instance (start/stop/resize) used in the DailyPython exercises.

This folder contains:

- `manage_ec2.py` — main Python script (executable CLI with shebang)
- helper shell scripts: `upgrade_120m.sh`, `downgrade.sh`, `start-signal.sh`, `stop-signal.sh`
- `requirements.txt` — Python dependencies (boto3, botocore, etc.)

Clone
-----

```bash
git clone https://github.com/VibishnathanG/DailyPython.git
cd DailyPython/100daysPython/simple_projects/aws-python-instance-1
```

Prerequisites
-------------

- Python 3.8+ available on PATH
- `sudo` privileges to install a CLI wrapper under `/usr/local/bin` (optional)
- AWS credentials configured (for `boto3`) if you will manage real EC2 instances.

Install Python deps (recommended, inside venv)
--------------------------------------------

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Install as a system CLI (two options)
------------------------------------

1) Copy (makes a standalone executable):

```bash
sudo cp manage_ec2.py /usr/local/bin/manage_ec2
sudo chmod +x /usr/local/bin/manage_ec2
```

2) Symlink (keeps working copy editable):

```bash
sudo ln -s "$(pwd)/manage_ec2.py" /usr/local/bin/manage_ec2
sudo chmod +x "$(pwd)/manage_ec2.py"
```

After either method you can run the CLI as:

```bash
manage_ec2 i-0123456789abcdef0 --action status
manage_ec2 i-0123456789abcdef0 --start --duration-minutes 120
manage_ec2 i-0123456789abcdef0 --action upgrade --yes
```

Notes
-----

- The script uses the shebang `#!/usr/bin/env python3` so installing to `/usr/local/bin` makes it act like a normal CLI.
- Keep a virtualenv if you prefer isolated dependencies; the system copy will use the system Python and packages.
- The repository originally included a cost-reporting helper which has been removed to avoid costly AWS Cost Explorer API calls.

Quick sanity checks
-------------------

Syntax check (local):

```bash
python -m py_compile manage_ec2.py
```

Run a quick help to verify installation:

```bash
manage_ec2 --help
```

Uninstall
---------

```bash
sudo rm /usr/local/bin/manage_ec2
# or remove the symlink you created
```

License & notes
----------------
This README is a lightweight install guide for personal use. Verify and audit scripts before running against production instances.
