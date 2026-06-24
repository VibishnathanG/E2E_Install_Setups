Write-Host "powershell -ExecutionPolicy Bypass -File E:\Temp\backup-wsl.ps1 --> Command is used"

$Distro = "WSL-Main-Ubuntu-24.04"

$BackupDir = "H:\My Drive\Backups"
$WorkDir = "E:\Temp"

$TS = Get-Date -Format "yyyyMMdd-HHmmss"

$Tar = "$WorkDir\$Distro-$TS.tar"
$TargetTar = "$BackupDir\$Distro-$TS.tar"

wsl --shutdown
wsl --export $Distro $Tar

Copy-Item $Tar $TargetTar

if (Test-Path $TargetTar) {

    Write-Host ""
    Write-Host "Backup copied successfully:"
    Write-Host "  $TargetTar"

    Write-Host ""
    Write-Host "Verify Google Drive sync before deleting local backup."

    Write-Host ""
    Write-Host "To delete the local TAR run:"
    Write-Host ""
    Write-Host "Remove-Item '$Tar' -Force"
}
else {

    Write-Host ""
    Write-Host "ERROR: Backup copy failed. Local TAR retained."
    Write-Host $Tar
}