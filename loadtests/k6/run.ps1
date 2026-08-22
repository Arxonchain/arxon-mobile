# Load env from repo .env for k6 (no secrets committed).
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $root) { $root = (Resolve-Path "$PSScriptRoot\..\..").Path }

function Read-DotEnv($path) {
  if (-not (Test-Path $path)) { return @{} }
  $map = @{}
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $v = $matches[2].Trim().Trim('"').Trim("'")
      $map[$matches[1]] = $v
    }
  }
  return $map
}

$envMap = @{}
foreach ($f in @('.env', '.env.local')) {
  foreach ($kv in (Read-DotEnv (Join-Path $root $f)).GetEnumerator()) {
    $envMap[$kv.Key] = $kv.Value
  }
}

$url = $envMap['VITE_SUPABASE_URL']
if (-not $url) { $url = $envMap['SUPABASE_URL'] }
$key = $envMap['VITE_SUPABASE_PUBLISHABLE_KEY']
if (-not $key) { $key = $envMap['VITE_SUPABASE_ANON_KEY'] }
if (-not $key) { $key = $envMap['SUPABASE_ANON_KEY'] }

if (-not $url -or -not $key) {
  Write-Error "Need VITE_SUPABASE_URL and publishable/anon key in $root\.env"
  exit 1
}

$scenario = $args[0]
if (-not $scenario) { $scenario = 'auth' }

$k6Args = @(
  '-e', "SUPABASE_URL=$url",
  '-e', "SUPABASE_ANON_KEY=$key"
)

switch ($scenario) {
  'auth' {
    $k6Args += @('-i', '35', '-u', '1', (Join-Path $PSScriptRoot 'auth-rate-limit.js'))
  }
  'arena' {
    $k6Args += @('-u', '10', '-d', '30s', (Join-Path $PSScriptRoot 'arena-rpcs.js'))
  }
  default {
    Write-Error "Usage: .\run.ps1 [auth|arena]"
    exit 1
  }
}

Write-Host "Running k6 $scenario against $url"
$k6 = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6) {
  Write-Host ""
  Write-Host "k6 is not installed. Install with one of:" -ForegroundColor Yellow
  Write-Host "  scoop install k6"
  Write-Host "  choco install k6 -y"
  Write-Host "Then open a NEW PowerShell window and re-run: npm run loadtest:$scenario"
  exit 1
}
& k6 run @k6Args
exit $LASTEXITCODE
