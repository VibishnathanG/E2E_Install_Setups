import asyncio
import edge_tts
import psutil
import socket
import requests
import os
from datetime import datetime
from playsound import playsound


# ------------------------------------------
# Internet Check
# ------------------------------------------

def internet_connected():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False


# ------------------------------------------
# Random Motivation Quote
# ------------------------------------------

def get_quote():
    try:
        response = requests.get(
            "https://zenquotes.io/api/random",
            timeout=5
        )

        data = response.json()[0]

        quote = data["q"]
        author = data["a"]

        return f'Here is your motivation for today. {quote}. By {author}.'

    except Exception:
        return "Keep moving forward. Small consistent progress creates extraordinary results."


# ------------------------------------------
# Greeting
# ------------------------------------------

now = datetime.now()

hour = now.hour

if hour < 12:
    greeting = "Good morning"
elif hour < 17:
    greeting = "Good afternoon"
else:
    greeting = "Good evening"

current_time = now.strftime("%I:%M %p")


# ------------------------------------------
# System Information
# ------------------------------------------

cpu = psutil.cpu_percent(interval=1)

memory = psutil.virtual_memory().percent

disk = psutil.disk_usage("C:\\").percent

processes = len(psutil.pids())

battery = psutil.sensors_battery()

if battery:
    if battery.power_plugged:
        battery_text = f"Battery is {int(battery.percent)} percent and charging."
    else:
        battery_text = f"Battery is {int(battery.percent)} percent."
else:
    battery_text = "Battery information is unavailable."

network = "connected" if internet_connected() else "disconnected"

quote = get_quote()


# ------------------------------------------
# Speech
# ------------------------------------------

speech = f"""
{greeting}, Shadow. Welcome back.

The current time is {current_time}.

All systems are operational.

There are currently {processes} running processes.

Processor usage is {cpu:.0f} percent.

Memory usage is {memory:.0f} percent.

Disk usage is {disk:.0f} percent.

{battery_text}

Internet is {network}.

Everything looks healthy.

{quote}

Have a productive day.
"""


# ------------------------------------------
# Voice
# ------------------------------------------

VOICE = "en-US-BrianMultilingualNeural"

OUTPUT = "startup_voice.mp3"


async def generate():
    communicate = edge_tts.Communicate(
        text=speech,
        voice=VOICE,
        rate="+20%",
        pitch="-2Hz",
        volume="-50%"
    )

    await communicate.save(OUTPUT)


# ------------------------------------------
# Run
# ------------------------------------------

asyncio.run(generate())

playsound(OUTPUT)

try:
    os.remove(OUTPUT)
except OSError:
    pass