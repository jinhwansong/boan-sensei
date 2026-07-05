param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("codex", "cursor", "claude")]
  [string] $Adapter,

  [Parameter(Mandatory = $true, Position = 1)]
  [string] $TargetPath
)

$ErrorActionPreference = "Stop"

function Copy-AdapterFile {
  param(
    [Parameter(Mandatory = $true)]
    [string] $Source,

    [Parameter(Mandatory = $true)]
    [string] $Destination,

    [Parameter(Mandatory = $true)]
    [string] $Fallback
  )

  if (Test-Path -LiteralPath $Destination) {
    $fallbackParent = Split-Path -Parent $Fallback
    New-Item -ItemType Directory -Path $fallbackParent -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Fallback -Force
    Write-Output "boan-sensei: existing file found, copied merge candidate to $Fallback"
    Write-Output "boan-sensei: review and merge it into $Destination"
    return
  }

  $destinationParent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination
  Write-Output "boan-sensei: installed adapter to $Destination"
}

if (-not (Test-Path -LiteralPath $TargetPath -PathType Container)) {
  throw "boan-sensei: target path does not exist: $TargetPath"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = (Resolve-Path $TargetPath).Path

switch ($Adapter) {
  "codex" {
    Copy-AdapterFile `
      -Source (Join-Path $repoRoot "adapters/codex/AGENTS.md") `
      -Destination (Join-Path $target "AGENTS.md") `
      -Fallback (Join-Path $target ".boan-sensei-adapter/AGENTS.boan-sensei.md")
  }
  "cursor" {
    Copy-AdapterFile `
      -Source (Join-Path $repoRoot "adapters/cursor/.cursor/rules/boan-sensei.mdc") `
      -Destination (Join-Path $target ".cursor/rules/boan-sensei.mdc") `
      -Fallback (Join-Path $target ".boan-sensei-adapter/cursor/boan-sensei.mdc")
  }
  "claude" {
    Copy-AdapterFile `
      -Source (Join-Path $repoRoot "adapters/claude/boan-sensei/SKILL.md") `
      -Destination (Join-Path $target "boan-sensei/SKILL.md") `
      -Fallback (Join-Path $target ".boan-sensei-adapter/claude/boan-sensei/SKILL.md")
  }
}

Write-Output "boan-sensei: adapter install step completed."
Write-Output "boan-sensei: make sure the local boan-sensei CLI command is available before running the adapter workflow."
