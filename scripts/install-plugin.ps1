param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("codex", "cursor", "claude")]
  [string] $Plugin,

  [Parameter(Mandatory = $true, Position = 1)]
  [string] $TargetPath
)

$ErrorActionPreference = "Stop"

function Copy-PluginFile {
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
  Write-Output "boan-sensei: installed plugin file to $Destination"
}

function Copy-PluginDirectory {
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
    if (Test-Path -LiteralPath $Fallback) {
      Remove-Item -LiteralPath $Fallback -Recurse -Force
    }
    Copy-Item -LiteralPath $Source -Destination $Fallback -Recurse
    Write-Output "boan-sensei: existing directory found, copied merge candidate to $Fallback"
    Write-Output "boan-sensei: review and merge it into $Destination"
    return
  }

  $destinationParent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse
  Write-Output "boan-sensei: installed plugin bundle to $Destination"
}

if (-not (Test-Path -LiteralPath $TargetPath -PathType Container)) {
  throw "boan-sensei: target path does not exist: $TargetPath"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$target = (Resolve-Path $TargetPath).Path

switch ($Plugin) {
  "codex" {
    Copy-PluginDirectory `
      -Source (Join-Path $repoRoot "plugins/codex-boan-sensei") `
      -Destination (Join-Path $target "codex-boan-sensei") `
      -Fallback (Join-Path $target ".boan-sensei-plugin/codex-boan-sensei")
  }
  "cursor" {
    Copy-PluginFile `
      -Source (Join-Path $repoRoot "plugins/cursor-boan-sensei/.cursor/rules/boan-sensei.mdc") `
      -Destination (Join-Path $target ".cursor/rules/boan-sensei.mdc") `
      -Fallback (Join-Path $target ".boan-sensei-plugin/cursor/boan-sensei.mdc")
  }
  "claude" {
    Copy-PluginDirectory `
      -Source (Join-Path $repoRoot "plugins/claude-code-boan-sensei/boan-sensei") `
      -Destination (Join-Path $target "boan-sensei") `
      -Fallback (Join-Path $target ".boan-sensei-plugin/claude/boan-sensei")
  }
}

Write-Output "boan-sensei: plugin install step completed."
Write-Output "boan-sensei: make sure the local boan-sensei CLI command is available before running the plugin workflow."
