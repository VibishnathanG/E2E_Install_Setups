# Replicating Draw.io Setup on a New System

To replicate this custom Draw.io setup on a new system, you have two choices:
1. **Named Volumes (Recommended)**: Let Docker handle files and permissions automatically.
2. **Bind Mounts**: Keep files visible on the host file system using a setup script.

---

## Method 1: Named Volumes (Recommended & Easiest)

Using **Docker Named Volumes** instead of host bind mounts solves two problems automatically:
* Docker copies the default files (like `server.xml`) from the image into the volume when it is created.
* Docker handles all permission and ownership issues internally, so you never get `Permission denied` errors.

### 1. Directory Structure on New System
Create a folder for your setup:
```text
drawio-setup/
├── docker-compose.yaml
├── index.html
└── diagrams/
    └── Main-Diagram.drawio
```

### 2. `docker-compose.yaml`
```yaml
version: "3.8"

services:
  drawio:
    image: jgraph/drawio:latest
    container_name: drawio
    ports:
      - "9003:8080"
      - "8443:8443"
    volumes:
      - drawio-fonts:/usr/local/tomcat/webapps/draw/fonts
      - drawio-conf:/usr/local/tomcat/conf
      - ./index.html:/usr/local/tomcat/webapps/draw/index.html
      - ./diagrams:/usr/local/tomcat/webapps/draw/diagrams
    environment:
      - PUBLIC_DNS=localhost
    restart: unless-stopped

volumes:
  drawio-fonts:
  drawio-conf:
```

### 3. `index.html`
Place the following code inside `index.html`. It contains the redirection script in `<head>` that auto-loads the custom diagram:
```html
<!DOCTYPE html>
<html>
<head>
    <script>
        (function() {
            var urlParams = {};
            try {
                var params = window.location.search.slice(1).split('&');
                for (var i = 0; i < params.length; i++) {
                    var pair = params[i].split('=');
                    urlParams[pair[0]] = pair[1];
                }
            } catch(e) {}
            
            if (!urlParams.url && !urlParams.data && !urlParams.xml && !urlParams.code) {
                var diagramUrl = window.location.origin + "/diagrams/Main-Diagram.drawio";
                var sep = window.location.search ? '&' : '?';
                window.location.href = window.location.pathname + window.location.search + sep + "url=" + encodeURIComponent(diagramUrl);
            }
        })();
    </script>
    <title>Flowchart Maker &amp; Online Diagram Software</title>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="Description" content="draw.io is free online diagram software for making flowcharts, process diagrams, org charts, UML, ER and network diagrams">
    <meta name="Keywords" content="drawio, diagram, online, flow chart, flowchart maker, uml, erd">
    <meta itemprop="name" content="draw.io - free flowchart maker and diagrams online">
	<meta itemprop="description" content="draw.io is a free online diagramming application and flowchart maker . You can use it to create UML, entity relationship, org charts, BPMN and BPM, database schema and networks. Also possible are telecommunication network, workflow, flowcharts, maps overlays and GIS, electronic circuit and social network diagrams.">
	<meta itemprop="image" content="https://lh4.googleusercontent.com/-cLKEldMbT_E/Tx8qXDuw6eI/AAAAAAAAAAs/Ke0pnlk8Gpg/w500-h344-k/BPMN%2Bdiagram%2Brc2f.png">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
	<meta name="msapplication-config" content="images/browserconfig.xml">
    <meta name="mobile-web-app-capable" content="yes">
	<meta name="theme-color" content="#d89000">
    <link rel="canonical" href="https://app.diagrams.net">
	<link rel="manifest" href="images/manifest.json">
	<link rel="icon" href="favicon.ico" sizes="any">
	<link rel="shortcut icon" href="favicon.ico">
    <link rel="apple-touch-icon" href="images/apple-touch-icon.png">
    <link rel="stylesheet" type="text/css" href="styles/grapheditor.css">
	<link rel="stylesheet" media="(forced-colors: active)" href="styles/high-contrast.css" id="high-contrast-stylesheet">
	<script src="js/bootstrap.js"></script>
	<style type="text/css">
		.geBlock {
			z-index:-3;
			margin:100px;
			margin-top:40px;
			margin-bottom:30px;
			padding:20px;
			text-align:center;
			min-width:50%;
		}
		.geBlock h1, .geBlock h2 {
			margin-top:0px;
			padding-top:0px;
		}
	</style>
</head>
<body class="geEditor geClassic">
<div id="geInfo">
	<div class="geBlock">
		<h1>Flowchart Maker and Online Diagram Software</h1>
		<p>
			draw.io is free online diagram software. You can use it as a flowchart maker, network diagram software, to create UML online, as an ER diagram tool, to design database schema, to build BPMN online, as a circuit diagram maker, and more. draw.io can import .vsdx, Gliffy&trade; and Lucidchart&trade; files .
		</p>
		<h2 id="geStatus">Loading... <img src="images/spin.gif"/></h2>
		<p>
			Please ensure JavaScript is enabled.
		</p>
	</div>
</div>
<script src="js/main.js"></script>
</body>
</html>
```

### 4. Running it
Simply place your diagram file into the `./diagrams/` folder named as `Main-Diagram.drawio`, and run:
```bash
docker compose up -d
```

---

## Method 2: Host Bind Mounts (using Setup Script)

If you prefer to have all Tomcat configurations visible on the host file system under a specific folder (like `/opt/drawio`), you must copy the configuration files and set system permissions manually.

### One-Click Setup Script
Save the script below as `setup-drawio.sh` on the new system and run it:

```bash
#!/bin/bash
set -e

# 1. Define paths
MOUNT_DIR="/opt/drawio"
CONF_DIR="$MOUNT_DIR/conf"
FONTS_DIR="$MOUNT_DIR/fonts"
DIAGRAMS_DIR="$MOUNT_DIR/diagrams"

# 2. Create directory structure
mkdir -p "$CONF_DIR" "$FONTS_DIR" "$DIAGRAMS_DIR"

# 3. Pull and extract default configuration files
echo "Extracting default Tomcat configurations..."
docker pull jgraph/drawio:latest
docker run --name temp_drawio -d jgraph/drawio:latest
docker cp temp_drawio:/usr/local/tomcat/conf/. "$CONF_DIR/"
docker cp temp_drawio:/usr/local/tomcat/webapps/draw/index.html "$MOUNT_DIR/index.html"
docker rm -f temp_drawio

# 4. Modify index.html for auto-redirection
echo "Injecting auto-load script into index.html..."
sed -i '/<title>/i \
    <script>\
        (function() {\
            var urlParams = {};\
            try {\
                var params = window.location.search.slice(1).split("&");\
                for (var i = 0; i < params.length; i++) {\
                    var pair = params[i].split("=");\
                    urlParams[pair[0]] = pair[1];\
                }\
            } catch(e) {}\
            if (!urlParams.url && !urlParams.data && !urlParams.xml && !urlParams.code) {\
                var diagramUrl = window.location.origin + "/diagrams/Main-Diagram.drawio";\
                var sep = window.location.search ? "&" : "?";\
                window.location.href = window.location.pathname + window.location.search + sep + "url=" + encodeURIComponent(diagramUrl);\
            }\
        })();\
    </script>' "$MOUNT_DIR/index.html"

# 5. Fix permissions for Tomcat user (UID 1001 / GID 999)
echo "Setting folder permissions..."
chown -R 1001:999 "$MOUNT_DIR"
chmod -R 775 "$MOUNT_DIR"

echo "Setup completed successfully! Please place your 'Main-Diagram.drawio' under $DIAGRAMS_DIR."
```

### Corresponding `docker-compose.yaml` (for Method 2)
```yaml
version: "3.8"

services:
  drawio:
    image: jgraph/drawio:latest
    container_name: drawio
    ports:
      - "9003:8080"
      - "8443:8443"
    volumes:
      - /opt/drawio/fonts:/usr/local/tomcat/webapps/draw/fonts
      - /opt/drawio/conf:/usr/local/tomcat/conf
      - /opt/drawio/index.html:/usr/local/tomcat/webapps/draw/index.html
      - /opt/drawio/diagrams:/usr/local/tomcat/webapps/draw/diagrams
    environment:
      - PUBLIC_DNS=localhost
    restart: unless-stopped
```

