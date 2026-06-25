# PowerShell Profile Configuration with Oh My Posh

## Open the PowerShell Profile

Open your PowerShell profile in your preferred editor:

```powershell
notepad $PROFILE
```

If the profile does not exist, create it first:

```powershell
New-Item -ItemType File -Force -Path $PROFILE
notepad $PROFILE
```

---

## Add the Following to `$PROFILE`

Append the following lines to your PowerShell profile:

```powershell
oh-my-posh init pwsh --config "$HOME\OneDrive\Documents\WindowsPowerShell\easy-term.json" | Invoke-Expression

Import-Module -Name Terminal-Icons
```

---

## Create the Theme File

Create the following file:

```text
$HOME\OneDrive\Documents\WindowsPowerShell\easy-term.json
```

Paste the following JSON into the file:

```json
{
  "$schema": "https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json",
  "version": 4,
  "final_space": true,
  "console_title_template": "{{ .Folder }}",
  "transient_prompt": {
    "background": "transparent",
    "foreground": "#c792ea",
    "template": "\ue285 "
  },
  "blocks": [
    {
      "type": "prompt",
      "alignment": "left",
      "newline": true,
      "segments": [
        {
          "type": "text",
          "style": "plain",
          "foreground": "#3d405b",
          "template": "\u256d\u2500 "
        },
        {
          "type": "session",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#ff79c6",
          "template": " \uf007 {{ .UserName }} "
        },
        {
          "type": "text",
          "style": "plain",
          "foreground": "#565f89",
          "template": " \uf178 "
        },
        {
          "type": "session",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#8be9fd",
          "template": " \uf108 {{ .HostName }} "
        },
        {
          "type": "text",
          "style": "plain",
          "foreground": "#44475a",
          "template": " \uebcb "
        },
        {
          "type": "path",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#bd93f9",
          "options": {
            "style": "agnoster_short",
            "max_depth": 4,
            "folder_separator_icon": " \ue0b1 ",
            "home_icon": "\uf7db home"
          },
          "template": " \ue5ff {{ .Path }} "
        },
        {
          "type": "git",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#50fa7b",
          "background_templates": [
            "{{ if or (.Working.Changed) (.Staging.Changed) }}#ffb86c{{ end }}",
            "{{ if gt .Ahead 0 }}#8be9fd{{ end }}",
            "{{ if gt .Behind 0 }}#ff5555{{ end }}"
          ],
          "options": {
            "branch_icon": "\ue725 ",
            "fetch_status": true,
            "fetch_upstream_icon": false
          },
          "template": " {{ .HEAD }}{{ if .BranchStatus }} {{ .BranchStatus }}{{ end }}{{ if .Working.Changed }} \uf044 {{ .Working.String }}{{ end }}{{ if and (.Working.Changed) (.Staging.Changed) }} |{{ end }}{{ if .Staging.Changed }} \uf046 {{ .Staging.String }}{{ end }}{{ if gt .StashCount 0 }} \ueb4b {{ .StashCount }}{{ end }} "
        },
        {
          "type": "python",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#f1fa8c",
          "options": {
            "display_mode": "environment",
            "fetch_virtual_env": true
          },
          "template": " \ue235 {{ if .Venv }}{{ .Venv }} {{ end }}{{ .Full }} "
        },
        {
          "type": "root",
          "style": "diamond",
          "leading_diamond": "\ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#ff5555",
          "template": " \uf292 root "
        }
      ]
    },
    {
      "type": "prompt",
      "alignment": "right",
      "segments": [
        {
          "type": "sysinfo",
          "style": "plain",
          "foreground": "#a9ffb4",
          "template": "\uf0e4 <#565f89>RAM:</> {{ (div ((sub .PhysicalTotalMemory .PhysicalAvailableMemory)|float64) 1073741824.0) }}/{{ (div .PhysicalTotalMemory 1073741824.0) }}GB"
        },
        {
          "type": "executiontime",
          "style": "diamond",
          "leading_diamond": " \ue0b6",
          "trailing_diamond": "\ue0b4",
          "foreground": "#1a1b26",
          "background": "#50fa7b",
          "options": {
            "style": "austin",
            "threshold": 500
          },
          "template": " \uf252 {{ .FormattedMs }} "
        },
        {
          "type": "time",
          "style": "plain",
          "foreground": "#ffb86c",
          "options": {
            "time_format": "Mon 3:04 PM"
          },
          "template": " \uf017 {{ .CurrentDate | date .Format }}"
        }
      ]
    },
    {
      "type": "prompt",
      "alignment": "left",
      "newline": true,
      "segments": [
        {
          "type": "text",
          "style": "plain",
          "foreground": "#3d405b",
          "template": "\u2570\u2500 "
        },
        {
          "type": "text",
          "style": "plain",
          "foreground": "#ff79c6",
          "template": "\u2622 "
        },
        {
          "type": "status",
          "style": "plain",
          "foreground": "#50fa7b",
          "foreground_templates": [
            "{{ if gt .Code 0 }}#ff5555{{ end }}"
          ],
          "options": {
            "always_enabled": true
          },
          "template": "\ue285 "
        }
      ]
    }
  ]
}
```

---

## Final Directory Structure

```text
OneDrive
└── Documents
    └── WindowsPowerShell
        ├── Microsoft.PowerShell_profile.ps1
        └── easy-term.json
```

---

## Reload the Profile

After saving both files, reload the profile without restarting PowerShell:

```powershell
. $PROFILE
```

---

## Verify Configuration

Check the profile location:

```powershell
$PROFILE
```

Verify the Oh My Posh configuration:

```powershell
oh-my-posh config validate --config "$HOME\OneDrive\Documents\WindowsPowerShell\easy-term.json"
```

If validation succeeds, open a new PowerShell or Windows Terminal session to see the customized prompt.
