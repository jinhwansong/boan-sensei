param(
  [Parameter(Mandatory = $true)]
  [string]$TargetProject
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $TargetProject -PathType Container)) {
  Write-Error "boan-sensei: target project directory not found: $TargetProject"
  exit 2
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cliPath = Join-Path $repoRoot "apps/cli/dist/index.js"
$command = Get-Command boan-sensei -ErrorAction SilentlyContinue
$start = Get-Date

Push-Location $TargetProject
try {
  if ($command) {
    & boan-sensei scan --mode basic
  } elseif (Test-Path -LiteralPath $cliPath -PathType Leaf) {
    & node $cliPath scan --mode basic
  } else {
    Write-Error "boan-sensei: CLI not found. Run pnpm build or expose boan-sensei on PATH."
    exit 2
  }

  if ($LASTEXITCODE -ne 0) {
    $elapsed = [int]((Get-Date) - $start).TotalMilliseconds
    Write-Error "boan-sensei: smoke scan failed with exit code $LASTEXITCODE after ${elapsed}ms"
    exit $LASTEXITCODE
  }

  $findingsPath = Join-Path $TargetProject ".boan-sensei/findings.json"
  $findingsFile = Get-Content -LiteralPath $findingsPath -Raw | ConvertFrom-Json
  $high = @($findingsFile.findings | Where-Object { $_.risk -eq "high" }).Count
  $medium = @($findingsFile.findings | Where-Object { $_.risk -eq "medium" }).Count
  $low = @($findingsFile.findings | Where-Object { $_.risk -eq "low" }).Count
  $total = @($findingsFile.findings).Count
  $elapsedMs = [int]((Get-Date) - $start).TotalMilliseconds

  Write-Output "boan-sensei smoke: high=$high medium=$medium low=$low total=$total elapsedMs=$elapsedMs"
} finally {
  Pop-Location
}
