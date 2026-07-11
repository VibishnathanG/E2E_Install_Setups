source /mnt/e/Upskill_Main/Main_Workspace/.venv/bin/activate
INSTANCE_ID=i-00675fe2bd1fc418c
export INSTANCE_ID
python3 /mnt/e/Upskill_Main/Main_Workspace/Programming/Python/workspace/DailyPython/100daysPython/simple_projects/aws-python-instance-1/manage_ec2.py $INSTANCE_ID --action downgrade --yes
python3 /mnt/e/Upskill_Main/Main_Workspace/Programming/Python/workspace/DailyPython/100daysPython/simple_projects/aws-python-instance-1/manage_ec2.py $INSTANCE_ID --action stop

#For Running in Background
#nohup python3 AWS/Scripts/manage_ec2.py i-0123456789abcdef0 --action downgrade --yes --duration-minutes 120 > manage_ec2.log 2>&1 &
#disown
