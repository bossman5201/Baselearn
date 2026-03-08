$ErrorActionPreference = "Stop"

function Resolve-Forge() {
  $command = Get-Command forge -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $fallbackPath = Join-Path $env:USERPROFILE ".foundry\bin\forge.exe"
  if (Test-Path $fallbackPath) {
    return $fallbackPath
  }

  throw "Could not find forge in PATH or at $fallbackPath."
}

$forgeCmd = Resolve-Forge
& $forgeCmd test -vv

if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
