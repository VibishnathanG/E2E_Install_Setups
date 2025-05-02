vi /etc/systemd/system/schedule-shutdown.service

[Unit]
Description=Schedule auto-shutdown 4 hours after boot
After=network.target atd.service
Wants=atd.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/schedule_shutdown.sh

[Install]
WantedBy=multi-user.target

#########################################################
vi /usr/local/bin/schedule_shutdown.sh

#--Paster Below--

#!/bin/bash
# schedule a one-time shutdown 4 hours from boot
echo "shutdown -h now" | at now + 4 hours

#---

systemctl start schedule-shutdown.service
systemctl enable schedule-shutdown.service