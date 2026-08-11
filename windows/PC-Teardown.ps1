# ═══════════════════════════════════════════════════════════════════════════════
#  PC-Teardown.ps1  —  Comprehensive Windows Diagnostic & Teardown Report
#  Run as Administrator for full data.  Output is LLM-paste-ready.
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$Clipboard  # -Clipboard to auto-copy the full report
)

$ErrorActionPreference = 'SilentlyContinue'
$timer = [System.Diagnostics.Stopwatch]::StartNew()

# ── Transcript (captures everything for clipboard / file) ─────────────────────
$transcriptPath = Join-Path $env:TEMP "PC-Teardown_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
Start-Transcript -Path $transcriptPath -Force | Out-Null

# ══════════════════════════════════════════════════════════════════════════════
#  FORMATTING HELPERS
# ══════════════════════════════════════════════════════════════════════════════

$line = ('═' * 94)

function Section($title) {
    Write-Host ""
    Write-Host "╔$line╗" -ForegroundColor DarkCyan
    Write-Host ("║ {0,-92} ║" -f $title) -ForegroundColor Cyan
    Write-Host "╚$line╝" -ForegroundColor DarkCyan
}

function SubSection($title) {
    Write-Host ""
    Write-Host "  ┌─── $title ───" -ForegroundColor DarkYellow
}

function TableOut($obj, $width = 220) {
    if ($null -eq $obj -or @($obj).Count -eq 0) {
        Write-Host "  (no data)" -ForegroundColor DarkGray
        return
    }
    $obj | Format-Table -AutoSize | Out-String -Width $width | Write-Host
}

function ListOut($obj) {
    if ($null -eq $obj) {
        Write-Host "  (no data)" -ForegroundColor DarkGray
        return
    }
    $obj | Format-List | Out-String | Write-Host
}

function InfoLine($label, $value) {
    Write-Host ("  {0,-28} : " -f $label) -ForegroundColor Gray -NoNewline
    Write-Host $value
}

function WarnLine($label, $value) {
    Write-Host ("  {0,-28} : " -f $label) -ForegroundColor Gray -NoNewline
    Write-Host $value -ForegroundColor Yellow
}

function GoodLine($label, $value) {
    Write-Host ("  {0,-28} : " -f $label) -ForegroundColor Gray -NoNewline
    Write-Host $value -ForegroundColor Green
}

function BadLine($label, $value) {
    Write-Host ("  {0,-28} : " -f $label) -ForegroundColor Gray -NoNewline
    Write-Host $value -ForegroundColor Red
}

function FormatBytes($bytes) {
    if ($bytes -ge 1TB) { return "{0:N2} TB" -f ($bytes / 1TB) }
    if ($bytes -ge 1GB) { return "{0:N2} GB" -f ($bytes / 1GB) }
    if ($bytes -ge 1MB) { return "{0:N2} MB" -f ($bytes / 1MB) }
    if ($bytes -ge 1KB) { return "{0:N2} KB" -f ($bytes / 1KB) }
    return "$bytes B"
}

function FormatUptime($ts) {
    $parts = @()
    if ($ts.Days   -gt 0) { $parts += "$($ts.Days)d" }
    if ($ts.Hours  -gt 0) { $parts += "$($ts.Hours)h" }
    if ($ts.Minutes -gt 0) { $parts += "$($ts.Minutes)m" }
    $parts += "$($ts.Seconds)s"
    return $parts -join ' '
}

# ══════════════════════════════════════════════════════════════════════════════
#  PRE-FETCH COMMON CIM DATA
# ══════════════════════════════════════════════════════════════════════════════

$os       = Get-CimInstance Win32_OperatingSystem
$cs       = Get-CimInstance Win32_ComputerSystem
$cpu      = Get-CimInstance Win32_Processor
$bios     = Get-CimInstance Win32_BIOS
$mem      = Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory
$ramSlots = Get-CimInstance Win32_PhysicalMemory
$disks    = Get-CimInstance Win32_DiskDrive
$volumes  = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
$nics     = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
$gpus     = Get-CimInstance Win32_VideoController
$uptime   = (Get-Date) - $os.LastBootUpTime

# ══════════════════════════════════════════════════════════════════════════════
#  1.  HEADER
# ══════════════════════════════════════════════════════════════════════════════

Section "🖥️  PC TEARDOWN REPORT"

InfoLine "Timestamp"       (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
InfoLine "OS"              "$($os.Caption)  [$($os.Version)]"
InfoLine "Build"           "$($os.BuildNumber)  ($($os.OSArchitecture))"
InfoLine "Install Date"    $os.InstallDate
InfoLine "Uptime"          (FormatUptime $uptime)
InfoLine "Manufacturer"    "$($cs.Manufacturer)  $($cs.Model)"
InfoLine "BIOS"            "$($bios.Manufacturer) — $($bios.SMBIOSBIOSVersion)"
Write-Host ""

Write-Host "  📌 LLM ANALYSIS REQUEST" -ForegroundColor Magenta
Write-Host "  Analyze this Windows teardown report like a Windows performance engineer and" -ForegroundColor DarkGray
Write-Host "  security analyst. Identify suspicious processes, unnecessary background apps," -ForegroundColor DarkGray
Write-Host "  startup bloat, browser memory abuse, virtualization overhead, telemetry," -ForegroundColor DarkGray
Write-Host "  overlays, driver anomalies, and anything unusual. Rank optimizations by impact." -ForegroundColor DarkGray

# ══════════════════════════════════════════════════════════════════════════════
#  2.  CPU INFORMATION
# ══════════════════════════════════════════════════════════════════════════════

Section "⚡ CPU Information"

foreach ($c in $cpu) {
    InfoLine "Processor"         $c.Name
    InfoLine "Cores / Threads"   "$($c.NumberOfCores) cores / $($c.NumberOfLogicalProcessors) threads"
    InfoLine "Base Clock"        "$($c.MaxClockSpeed) MHz"
    InfoLine "Socket"            $c.SocketDesignation
    InfoLine "L2 Cache"          (FormatBytes ($c.L2CacheSize * 1KB))
    InfoLine "L3 Cache"          (FormatBytes ($c.L3CacheSize * 1KB))

    $load = $c.LoadPercentage
    if     ($load -gt 80) { BadLine  "Current Load" "$load %" }
    elseif ($load -gt 50) { WarnLine "Current Load" "$load %" }
    else                  { GoodLine "Current Load" "$load %" }
}

# ══════════════════════════════════════════════════════════════════════════════
#  3.  OVERALL MEMORY
# ══════════════════════════════════════════════════════════════════════════════

Section "📊 Overall Memory"

$totalGB     = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$freeGB      = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedGB      = [math]::Round($totalGB - $freeGB, 2)
$usedPct     = [math]::Round(($usedGB / $totalGB) * 100, 1)

$availGB     = [math]::Round($mem.AvailableMBytes / 1024, 2)
$cacheGB     = [math]::Round($mem.CacheBytes / 1GB, 2)
$commitGB    = [math]::Round($mem.CommittedBytes / 1GB, 2)
$commitLimGB = [math]::Round($mem.CommitLimit / 1GB, 2)
$pagedGB     = [math]::Round($mem.PoolPagedBytes / 1GB, 2)
$nonPagedGB  = [math]::Round($mem.PoolNonpagedBytes / 1GB, 2)

InfoLine "Total RAM"         "$totalGB GB"
if     ($usedPct -gt 85) { BadLine  "In Use"   "$usedGB GB  ($usedPct %)" }
elseif ($usedPct -gt 65) { WarnLine "In Use"   "$usedGB GB  ($usedPct %)" }
else                     { GoodLine "In Use"   "$usedGB GB  ($usedPct %)" }
InfoLine "Available"         "$availGB GB"
InfoLine "Cached"            "$cacheGB GB"
InfoLine "Commit Used/Limit" "$commitGB / $commitLimGB GB"
InfoLine "Paged Pool"        "$pagedGB GB"
InfoLine "Non-Paged Pool"    "$nonPagedGB GB"

# ── RAM Stick Details ─────────────────────────────────────────────────────────
SubSection "Physical RAM Sticks"

$sticks = $ramSlots | ForEach-Object {
    [PSCustomObject]@{
        Bank         = $_.BankLabel
        Slot         = $_.DeviceLocator
        CapacityGB   = [math]::Round($_.Capacity / 1GB, 1)
        Speed        = "$($_.ConfiguredClockSpeed) MHz"
        Type         = switch ($_.SMBIOSMemoryType) {
                           20 {"DDR"} 21 {"DDR2"} 22 {"DDR2 FB"}
                           24 {"DDR3"} 26 {"DDR4"} 34 {"DDR5"}
                           default {"Type $($_.SMBIOSMemoryType)"}
                       }
        Manufacturer = $_.Manufacturer
        PartNumber   = ($_.PartNumber -replace '\s+$','')
    }
}
TableOut $sticks

# ══════════════════════════════════════════════════════════════════════════════
#  4.  GPU INFORMATION
# ══════════════════════════════════════════════════════════════════════════════

Section "🎮 GPU Information"

foreach ($g in $gpus) {
    InfoLine "GPU Name"          $g.Name
    InfoLine "Driver Version"    $g.DriverVersion
    InfoLine "Driver Date"       $g.DriverDate
    InfoLine "Adapter RAM"       (FormatBytes $g.AdapterRAM)
    InfoLine "Video Mode"        "$($g.CurrentHorizontalResolution) x $($g.CurrentVerticalResolution) @ $($g.CurrentRefreshRate) Hz"
    InfoLine "Status"            $g.Status
    Write-Host ""
}

# ══════════════════════════════════════════════════════════════════════════════
#  5.  TOP PROCESS GROUPS BY RAM (AGGREGATED)
# ══════════════════════════════════════════════════════════════════════════════

Section "🧠 Top Process Groups by RAM (Aggregated)"

$grouped = Get-Process |
    Group-Object ProcessName |
    ForEach-Object {
        $ws = ($_.Group | Measure-Object WorkingSet64 -Sum).Sum
        $pm = ($_.Group | Measure-Object PrivateMemorySize64 -Sum).Sum
        [PSCustomObject]@{
            Process      = $_.Name
            Instances    = $_.Count
            WorkingSetGB = [math]::Round($ws / 1GB, 2)
            PrivateGB    = [math]::Round($pm / 1GB, 2)
        }
    } |
    Sort-Object WorkingSetGB -Descending |
    Select-Object -First 30

TableOut $grouped

# ══════════════════════════════════════════════════════════════════════════════
#  6.  TOP INDIVIDUAL PROCESSES (CPU% / RAM / PATH)
# ══════════════════════════════════════════════════════════════════════════════

Section "🔥 Top Individual Processes (CPU% / RAM / Path)"

# Build a lookup of real CPU% per process using Win32_PerfFormattedData_PerfProc_Process
# Map by exact PID (IDProcess) and normalize by logical processor count (0-100% of total CPU)
$cpuPidMap = @{}
try {
    $logicalCores = (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors
    if (-not $logicalCores -or $logicalCores -lt 1) { $logicalCores = [Environment]::ProcessorCount }

    $perfProcs = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop |
        Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' }

    foreach ($p in $perfProcs) {
        $pidVal = [int]$p.IDProcess
        $normalized = [math]::Round($p.PercentProcessorTime / $logicalCores, 1)
        $cpuPidMap[$pidVal] = $normalized
    }
}
catch {
    Write-Host "  ⚠ CPU% counters unavailable." -ForegroundColor Yellow
}

$topProc = Get-Process |
    Sort-Object WorkingSet64 -Descending |
    Select-Object -First 40 `
        Name,
        Id,
        @{N='CPU%';      E={
            if ($cpuPidMap.ContainsKey($_.Id)) {
                $cpuPidMap[$_.Id]
            } else { 0 }
        }},
        @{N='RAM(GB)';   E={[math]::Round($_.WorkingSet64/1GB,2)}},
        @{N='Private(GB)';E={[math]::Round($_.PrivateMemorySize64/1GB,2)}},
        @{N='Threads';   E={$_.Threads.Count}},
        @{N='Handles';   E={$_.HandleCount}},
        Path

TableOut $topProc 300

# ══════════════════════════════════════════════════════════════════════════════
#  7.  DISK I/O BY PROCESS
# ══════════════════════════════════════════════════════════════════════════════

Section "💽 Disk I/O by Process (Read / Write MB/sec)"

try {
    $io = Get-Counter '\Process(*)\IO Read Bytes/sec','\Process(*)\IO Write Bytes/sec'

    $map = @{}

    foreach ($s in $io.CounterSamples) {
        $name = ($s.Path -split '\\')[-2]
        if ($name -in @('_Total','Idle')) { continue }

        if (-not $map.ContainsKey($name)) {
            $map[$name] = [ordered]@{ Read = 0; Write = 0 }
        }

        if ($s.Path -like '*IO Read Bytes/sec') {
            $map[$name].Read += $s.CookedValue
        } else {
            $map[$name].Write += $s.CookedValue
        }
    }

    $disk = $map.GetEnumerator() |
        ForEach-Object {
            [PSCustomObject]@{
                Process  = $_.Key
                ReadMBs  = [math]::Round($_.Value.Read / 1MB, 2)
                WriteMBs = [math]::Round($_.Value.Write / 1MB, 2)
            }
        } |
        Sort-Object { $_.ReadMBs + $_.WriteMBs } -Descending |
        Select-Object -First 25

    TableOut $disk
}
catch {
    Write-Host "  ⚠ Disk I/O counters unavailable (run as Admin)." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  8.  GPU PROCESS MEMORY
# ══════════════════════════════════════════════════════════════════════════════

Section "🎮 GPU Processes (Dedicated / Shared Memory)"

try {
    $gpuMem = Get-Counter '\GPU Process Memory(*)\Dedicated Usage','\GPU Process Memory(*)\Shared Usage' |
        Select-Object -ExpandProperty CounterSamples |
        Group-Object InstanceName |
        ForEach-Object {
            $ded = ($_.Group | Where-Object Path -like '*Dedicated Usage').CookedValue
            $sha = ($_.Group | Where-Object Path -like '*Shared Usage').CookedValue
            [PSCustomObject]@{
                Process     = $_.Name
                DedicatedMB = [math]::Round((($ded | Measure-Object -Sum).Sum) / 1MB, 1)
                SharedMB    = [math]::Round((($sha | Measure-Object -Sum).Sum) / 1MB, 1)
            }
        } |
        Sort-Object DedicatedMB -Descending |
        Select-Object -First 25

    TableOut $gpuMem
}
catch {
    Write-Host "  ⚠ GPU memory counters unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  9.  GPU ENGINE ACTIVITY
# ══════════════════════════════════════════════════════════════════════════════

Section "🎯 GPU Engine Activity"

try {
    $gpuEngine = Get-Counter '\GPU Engine(*)\Utilization Percentage' |
        Select-Object -ExpandProperty CounterSamples |
        Where-Object CookedValue -gt 0 |
        Sort-Object CookedValue -Descending |
        Select-Object -First 25 `
            InstanceName,
            @{N='GPU%';E={[math]::Round($_.CookedValue,1)}}

    TableOut $gpuEngine
}
catch {
    Write-Host "  ⚠ GPU engine counters unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  10.  DISK & PARTITION HEALTH
# ══════════════════════════════════════════════════════════════════════════════

Section "💾 Disk & Partition Health"

SubSection "Physical Disks"

$diskInfo = $disks | ForEach-Object {
    [PSCustomObject]@{
        Disk       = $_.DeviceID
        Model      = $_.Model
        SizeGB     = [math]::Round($_.Size / 1GB, 1)
        Interface  = $_.InterfaceType
        MediaType  = $_.MediaType
        Partitions = $_.Partitions
        Status     = $_.Status
    }
}
TableOut $diskInfo

SubSection "Volumes / Free Space"

$volInfo = $volumes | ForEach-Object {
    $usedPctVol = if ($_.Size -gt 0) { [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 1) } else { 0 }
    [PSCustomObject]@{
        Drive    = $_.DeviceID
        Label    = $_.VolumeName
        SizeGB   = [math]::Round($_.Size / 1GB, 1)
        FreeGB   = [math]::Round($_.FreeSpace / 1GB, 1)
        'Used%'  = $usedPctVol
        FileSystem = $_.FileSystem
    }
}
TableOut $volInfo

foreach ($v in $volumes) {
    if ($v.Size -gt 0) {
        $pct = [math]::Round((($v.Size - $v.FreeSpace) / $v.Size) * 100, 1)
        $freeGB_v = [math]::Round($v.FreeSpace / 1GB, 1)
        if ($pct -gt 90) {
            BadLine  "⛔ $($v.DeviceID)" "CRITICAL — $pct% used, only $freeGB_v GB free"
        } elseif ($pct -gt 75) {
            WarnLine "⚠  $($v.DeviceID)" "Warning — $pct% used, $freeGB_v GB free"
        }
    }
}

# ══════════════════════════════════════════════════════════════════════════════
#  11.  NETWORK ADAPTERS
# ══════════════════════════════════════════════════════════════════════════════

Section "🌐 Network Adapters"

$nicInfo = $nics | ForEach-Object {
    [PSCustomObject]@{
        Description = $_.Description
        IP          = ($_.IPAddress -join ', ')
        Gateway     = ($_.DefaultIPGateway -join ', ')
        DNS         = ($_.DNSServerSearchOrder -join ', ')
        DHCP        = $_.DHCPEnabled
    }
}
TableOut $nicInfo 300

# ══════════════════════════════════════════════════════════════════════════════
#  12.  PROCESSES WITH ACTIVE NETWORK CONNECTIONS
# ══════════════════════════════════════════════════════════════════════════════

Section "🔗 Processes with Active Network Connections"

try {
    $net = Get-NetTCPConnection -State Established |
        Group-Object OwningProcess |
        ForEach-Object {
            $procId = [int]$_.Name
            $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($p) {
                $remotes = Get-NetTCPConnection -OwningProcess $procId -State Established -ErrorAction SilentlyContinue |
                    Select-Object -ExpandProperty RemoteAddress -Unique |
                    Where-Object { $_ -ne '127.0.0.1' -and $_ -ne '::1' }
                [PSCustomObject]@{
                    Process     = $p.ProcessName
                    PID         = $procId
                    Connections = $_.Count
                    RemoteIPs   = ($remotes | Select-Object -First 5) -join ', '
                }
            }
        } |
        Sort-Object Connections -Descending |
        Select-Object -First 25

    TableOut $net 300
}
catch {
    Write-Host "  ⚠ Network connection enumeration unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  13.  LISTENING PORTS
# ══════════════════════════════════════════════════════════════════════════════

Section "🔓 Listening Ports"

try {
    $listening = Get-NetTCPConnection -State Listen |
        ForEach-Object {
            $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
            [PSCustomObject]@{
                Port    = $_.LocalPort
                Address = $_.LocalAddress
                PID     = $_.OwningProcess
                Process = if ($p) { $p.ProcessName } else { '(unknown)' }
                Path    = if ($p) { $p.Path } else { '' }
            }
        } |
        Sort-Object Port |
        Select-Object -Unique -Property Port, Address, PID, Process, Path |
        Select-Object -First 30

    TableOut $listening 300
}
catch {
    Write-Host "  ⚠ Listening port enumeration unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  14.  FIREWALL STATUS
# ══════════════════════════════════════════════════════════════════════════════

Section "🛡️ Firewall Status"

try {
    $fw = Get-NetFirewallProfile | Select-Object Name, Enabled, DefaultInboundAction, DefaultOutboundAction
    TableOut $fw
}
catch {
    Write-Host "  ⚠ Firewall status unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  15.  WINDOWS DEFENDER STATUS
# ══════════════════════════════════════════════════════════════════════════════

Section "🛡️ Windows Defender / Security"

try {
    $defender = Get-MpComputerStatus
    InfoLine "Antivirus Enabled"        $defender.AntivirusEnabled
    InfoLine "Real-Time Protection"     $defender.RealTimeProtectionEnabled
    InfoLine "Behavior Monitor"         $defender.BehaviorMonitorEnabled
    InfoLine "Antispyware Enabled"      $defender.AntispywareEnabled
    InfoLine "Signature Version"        $defender.AntivirusSignatureVersion
    InfoLine "Last Signature Update"    $defender.AntivirusSignatureLastUpdated
    InfoLine "Last Quick Scan"          $defender.QuickScanEndTime
    InfoLine "Last Full Scan"           $defender.FullScanEndTime

    $sigAge = (Get-Date) - $defender.AntivirusSignatureLastUpdated
    if ($sigAge.Days -gt 7) {
        BadLine "⛔ Signatures" "OUT OF DATE — $($sigAge.Days) days old!"
    } elseif ($sigAge.Days -gt 3) {
        WarnLine "⚠ Signatures" "$($sigAge.Days) days old"
    } else {
        GoodLine "✔ Signatures" "Up to date ($($sigAge.Days)d ago)"
    }
}
catch {
    Write-Host "  ⚠ Defender status unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  16.  SVCHOST BREAKDOWN
# ══════════════════════════════════════════════════════════════════════════════

Section "🛠️ svchost Breakdown (PID → Services)"

try {
    $svchostOutput = & tasklist /svc /fi "imagename eq svchost.exe" 2>&1
    Write-Host ($svchostOutput | Out-String)
}
catch {
    Write-Host "  ⚠ svchost service mapping unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  17.  KEY WINDOWS SERVICES
# ══════════════════════════════════════════════════════════════════════════════

Section "⚙️ Key Windows Services Status"

$serviceNames = @(
    'wuauserv',      # Windows Update
    'WinDefend',     # Windows Defender
    'MpsSvc',        # Firewall
    'Spooler',       # Print Spooler
    'BITS',          # Background Transfer
    'WSearch',       # Windows Search
    'SysMain',       # Superfetch
    'DiagTrack',     # Telemetry
    'dmwappushservice', # WAP Push
    'RemoteRegistry',   # Remote Registry
    'TermService',      # Remote Desktop
    'WerSvc',           # Error Reporting
    'TabletInputService', # Touch Keyboard
    'MapsBroker',       # Downloaded Maps
    'lfsvc',            # Geolocation
    'XblAuthManager',   # Xbox Auth
    'XblGameSave',      # Xbox Game Save
    'XboxNetApiSvc',    # Xbox Networking
    'Fax'               # Fax
)

$svcStatus = $serviceNames | ForEach-Object {
    $svc = Get-Service -Name $_ -ErrorAction SilentlyContinue
    if ($svc) {
        [PSCustomObject]@{
            Name        = $svc.Name
            DisplayName = $svc.DisplayName
            Status      = $svc.Status
            StartType   = $svc.StartType
        }
    }
}
TableOut $svcStatus

# ══════════════════════════════════════════════════════════════════════════════
#  18.  STARTUP APPLICATIONS
# ══════════════════════════════════════════════════════════════════════════════

Section "🚀 Startup Applications"

try {
    $startup = Get-CimInstance Win32_StartupCommand |
        Select-Object Name, Command, Location

    TableOut $startup 300
}
catch {
    Write-Host "  ⚠ Startup command enumeration unavailable." -ForegroundColor Yellow
}

# ── Registry Run Keys ────────────────────────────────────────────────────────
SubSection "Registry Run Keys (HKLM)"

try {
    $regRun = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
    if ($regRun) {
        $regRun.PSObject.Properties |
            Where-Object { $_.Name -notin @('PSPath','PSParentPath','PSChildName','PSDrive','PSProvider') } |
            ForEach-Object { InfoLine $_.Name $_.Value }
    }
}
catch {
    Write-Host "  ⚠ Registry run keys unavailable." -ForegroundColor Yellow
}

SubSection "Registry Run Keys (HKCU)"

try {
    $regRunUser = Get-ItemProperty 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run' -ErrorAction SilentlyContinue
    if ($regRunUser) {
        $regRunUser.PSObject.Properties |
            Where-Object { $_.Name -notin @('PSPath','PSParentPath','PSChildName','PSDrive','PSProvider') } |
            ForEach-Object { InfoLine $_.Name $_.Value }
    }
}
catch {
    Write-Host "  ⚠ User registry run keys unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  19.  SCHEDULED TASKS (NON-MICROSOFT)
# ══════════════════════════════════════════════════════════════════════════════

Section "📅 Scheduled Tasks (Non-Microsoft)"

try {
    $tasks = Get-ScheduledTask |
        Where-Object { $_.TaskPath -notlike '\Microsoft\*' -and $_.State -ne 'Disabled' } |
        Select-Object TaskName, TaskPath, State,
            @{N='Author';E={$_.Principal.UserId}},
            @{N='Actions';E={($_.Actions | ForEach-Object { $_.Execute }) -join '; '}} |
        Sort-Object TaskName |
        Select-Object -First 30

    TableOut $tasks 300
}
catch {
    Write-Host "  ⚠ Scheduled task enumeration unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  20.  INSTALLED DRIVERS (NON-MICROSOFT)
# ══════════════════════════════════════════════════════════════════════════════

Section "🔧 Third-Party Drivers"

try {
    $drivers = Get-WindowsDriver -Online -All -ErrorAction SilentlyContinue |
        Where-Object { $_.ProviderName -notlike '*Microsoft*' } |
        Select-Object -Property ClassName, ProviderName, Version, Date |
        Sort-Object ClassName |
        Select-Object -First 30

    if ($drivers) { TableOut $drivers }
    else {
        # Fallback: use driverquery
        $dq = & driverquery /v /fo csv 2>&1 | ConvertFrom-Csv -ErrorAction SilentlyContinue |
            Where-Object { $_.'Link Date' -and $_.State -eq 'Running' } |
            Select-Object 'Module Name', 'Display Name', 'Driver Type', 'Link Date' -First 30
        TableOut $dq
    }
}
catch {
    Write-Host "  ⚠ Driver enumeration unavailable (run as Admin)." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  21.  RECENT CRITICAL / ERROR EVENTS (SYSTEM + APPLICATION)
# ══════════════════════════════════════════════════════════════════════════════

Section "🚨 Recent Critical & Error Events (Last 24h)"

try {
    $since = (Get-Date).AddHours(-24)

    SubSection "System Log"
    $sysErrors = Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=$since} -MaxEvents 15 -ErrorAction SilentlyContinue |
        Select-Object TimeCreated, Id, LevelDisplayName, ProviderName,
            @{N='Message';E={($_.Message -split "`n")[0].Substring(0, [Math]::Min(($_.Message -split "`n")[0].Length, 100))}}
    TableOut $sysErrors 300

    SubSection "Application Log"
    $appErrors = Get-WinEvent -FilterHashtable @{LogName='Application'; Level=1,2; StartTime=$since} -MaxEvents 15 -ErrorAction SilentlyContinue |
        Select-Object TimeCreated, Id, LevelDisplayName, ProviderName,
            @{N='Message';E={($_.Message -split "`n")[0].Substring(0, [Math]::Min(($_.Message -split "`n")[0].Length, 100))}}
    TableOut $appErrors 300
}
catch {
    Write-Host "  ⚠ Event log unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  22.  ENVIRONMENT SNAPSHOT
# ══════════════════════════════════════════════════════════════════════════════

Section "🌍 Environment Snapshot"

InfoLine "PowerShell Version"  $PSVersionTable.PSVersion
InfoLine "CLR Version"         $PSVersionTable.CLRVersion
InfoLine ".NET Version"        ([System.Runtime.InteropServices.RuntimeInformation]::FrameworkDescription)
InfoLine "TEMP"                $env:TEMP
InfoLine "PATH entries"        ($env:PATH -split ';').Count

SubSection "PowerShell Execution Policy"
InfoLine "Current Policy"      (Get-ExecutionPolicy)
InfoLine "Machine Policy"      (Get-ExecutionPolicy -Scope MachinePolicy)
InfoLine "User Policy"         (Get-ExecutionPolicy -Scope UserPolicy)

# ══════════════════════════════════════════════════════════════════════════════
#  23.  WINDOWS UPDATE HISTORY (LAST 10)
# ══════════════════════════════════════════════════════════════════════════════

Section "🔄 Recent Windows Updates (Last 10)"

try {
    $updates = Get-HotFix |
        Sort-Object InstalledOn -Descending |
        Select-Object -First 10 `
            HotFixID,
            Description,
            InstalledOn

    TableOut $updates
}
catch {
    Write-Host "  ⚠ Update history unavailable." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════════════════════════
#  24.  LARGE TEMP FILES
# ══════════════════════════════════════════════════════════════════════════════

Section "🗑️ Temp Folder Sizes"

$tempPaths = @($env:TEMP, "$env:WINDIR\Temp")

foreach ($tp in $tempPaths) {
    try {
        $tempSize = (Get-ChildItem -Path $tp -Recurse -Force -ErrorAction SilentlyContinue |
            Measure-Object -Property Length -Sum).Sum
        if ($tempSize -gt 1GB) {
            WarnLine $tp (FormatBytes $tempSize)
        } else {
            InfoLine $tp (FormatBytes $tempSize)
        }
    }
    catch {
        InfoLine $tp "(inaccessible)"
    }
}

# ══════════════════════════════════════════════════════════════════════════════
#  25.  LLM PROMPT
# ══════════════════════════════════════════════════════════════════════════════

Section "🤖 Paste Into an LLM"

Write-Host @"

Analyze this PC teardown report like a Windows performance engineer and security analyst.

Tasks:

 1. Identify suspicious processes or malware-like behavior.
 2. Identify unnecessary background applications.
 3. Find the biggest RAM, CPU, disk, GPU, and network hogs.
 4. Group browser-related processes and estimate real browser footprint.
 5. Explain whether memory usage is healthy (including commit ratio).
 6. Flag startup bloat, telemetry, and overlay software.
 7. Recommend services/apps that can be disabled safely.
 8. Review listening ports for anything unexpected.
 9. Check driver versions for outdated or problematic drivers.
10. Flag any critical/error events that indicate underlying issues.
11. Highlight anything that looks abnormal for a Windows 11 developer workstation.
12. Rank optimizations by highest performance gain with lowest risk.
13. Tell me if anything appears to be running behind my back.

Give a concise executive summary first, then a detailed breakdown by category.
"@

# ══════════════════════════════════════════════════════════════════════════════
#  FOOTER
# ══════════════════════════════════════════════════════════════════════════════

$timer.Stop()
Write-Host ""
Write-Host "╔$line╗" -ForegroundColor DarkGreen
Write-Host ("║ {0,-92} ║" -f "✅  Report complete in $([math]::Round($timer.Elapsed.TotalSeconds, 1))s — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')") -ForegroundColor Green
Write-Host "╚$line╝" -ForegroundColor DarkGreen

Stop-Transcript | Out-Null

# ── Clipboard copy (transcript is ephemeral — only kept for clipboard) ────────
if ($Clipboard) {
    try {
        Get-Content $transcriptPath -Raw | Set-Clipboard
        Write-Host ""
        Write-Host "  📋 Full report copied to clipboard!" -ForegroundColor Green
    }
    catch {
        Write-Host "  ⚠ Clipboard copy failed." -ForegroundColor Yellow
    }
}

# Silently clean up the temp transcript file
Remove-Item $transcriptPath -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  💡 Run with -Clipboard to auto-copy the full report." -ForegroundColor DarkGray
Write-Host ""

