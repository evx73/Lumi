$ErrorActionPreference = 'Stop'
$resources = 'C:\Program Files\Lumi\resources'
$custom = Join-Path $env:APPDATA 'src\lumi\custom'
if (Get-Process Lumi -ErrorAction SilentlyContinue) { throw 'Close Lumi first.' }
if (!(Test-Path "$custom\build\src\main.js")) { throw 'Compile custom source first.' }
if (Test-Path "$resources\app-before-custom") { throw 'Backup already exists. Inspect before proceeding.' }
if ((Get-Item "$resources\app").LinkType) { throw 'App is already linked.' }
Rename-Item "$resources\app" 'app-before-custom'
try {
  & cmd.exe /c "mklink /J `"$resources\app`" `"$custom`""
  if ($LASTEXITCODE -ne 0) { throw 'mklink failed' }
} catch {
  if (!(Test-Path "$resources\app")) { Rename-Item "$resources\app-before-custom" 'app' }
  throw
}
Write-Host 'Linked Lumi app to custom worktree.'
