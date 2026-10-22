# USB live reload for the private wallet APK.
# Does not write Play Store OTA (pages.dev).
param(
  [ValidateSet('install', 'serve', 'reverse')]
  [string]$Command = 'serve',
  [string]$Udid = $(if ($env:ARXON_UDID) { $env:ARXON_UDID } else { 'bq8hw8cyf6nfytpb' })
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$adb = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
if (-not (Test-Path $adb)) { $adb = 'adb' }

function Ensure-Java {
  if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = [Environment]::GetEnvironmentVariable('JAVA_HOME', 'User')
  }
}

function Reverse-Port {
  & $adb -s $Udid reverse tcp:8080 tcp:8080
  if ($LASTEXITCODE -ne 0) { throw 'adb reverse failed. Plug in the phone and allow USB debugging.' }
  Write-Host "adb reverse tcp:8080 tcp:8080 ($Udid)"
}

function Keep-Reverse {
  # USB reverse dies on cable glitches / adb restarts. Re-apply it while Vite is up.
  $adbPath = $adb
  $serial = $Udid
  Start-Job -Name 'arxon-adb-reverse' -ScriptBlock {
    param($adbPath, $serial)
    while ($true) {
      try { & $adbPath -s $serial reverse tcp:8080 tcp:8080 | Out-Null } catch {}
      Start-Sleep -Seconds 8
    }
  } -ArgumentList $adbPath, $serial | Out-Null
}

function Serve-Vite {
  $env:CAPACITOR_LIVE_USB = 'true'
  $env:VITE_WALLET_SHELL = 'true'
  $env:VITE_ARXON_UI_V2 = 'true'
  $env:VITE_WORD_FORGE_ENABLED = 'true'
  Reverse-Port
  Keep-Reverse
  Write-Host 'Vite on http://127.0.0.1:8080 - keep this window open and the cable in.'
  npx vite --mode word-forge --host 127.0.0.1 --port 8080 --strictPort
}

if ($Command -eq 'reverse') {
  Reverse-Port
  return
}

if ($Command -eq 'serve') {
  Serve-Vite
  return
}

Ensure-Java
$env:CAPACITOR_LIVE_USB = 'true'
$env:CAPACITOR_BUNDLE_LOCAL = 'false'
Write-Host 'Sync Capacitor with USB live URL (not pages.dev)...'
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'cap sync failed' }

Write-Host 'Building debug APK...'
Push-Location (Join-Path $root 'android')
try {
  & .\gradlew.bat assembleDebug --no-daemon
  if ($LASTEXITCODE -ne 0) { throw 'gradle assembleDebug failed' }
} finally {
  Pop-Location
}

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
if (-not (Test-Path $apk)) { throw "APK missing: $apk" }

Write-Host 'Installing debug APK (install -r; uninstall only if signatures differ)...'
& $adb -s $Udid install -r $apk
if ($LASTEXITCODE -ne 0) {
  Write-Host 'install -r failed (likely a different signing key). Uninstall Play/store build, then retry.'
  throw 'adb install failed'
}

Reverse-Port
& $adb -s $Udid shell am force-stop xyz.arxonchain.app
& $adb -s $Udid shell am start -n xyz.arxonchain.app/.MainActivity
Write-Host 'Installed live APK. Run: npm run phone:live'
