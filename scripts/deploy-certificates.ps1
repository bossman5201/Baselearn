param(
  [ValidateSet("base-sepolia", "base")]
  [string]$Network = "base-sepolia"
)

$ErrorActionPreference = "Stop"

function Load-DotEnv([string]$Path = ".env") {
  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
      return
    }

    $pair = $line -split "=", 2
    if ($pair.Count -ne 2) {
      return
    }

    $name = $pair[0].Trim()
    $value = $pair[1].Trim()

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name, "Process"))) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Require-Command([string]$Name) {
  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $fallbackPath = Join-Path $env:USERPROFILE ".foundry\bin\$Name.exe"
  if (Test-Path $fallbackPath) {
    return $fallbackPath
  }

  throw "Required command '$Name' was not found in PATH or at $fallbackPath."
}

function Require-Env([string]$Name) {
  $Value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required environment variable: $Name"
  }

  return $Value.Trim()
}

Load-DotEnv

$forgeCmd = Require-Command "forge"
$castCmd = Require-Command "cast"

$privateKey = Require-Env "PRIVATE_KEY"
$admin = Require-Env "CONTRACT_ADMIN_WALLET"
$issuer = Require-Env "CONTRACT_ISSUER_WALLET"
$pauser = Require-Env "CONTRACT_PAUSER_WALLET"
$metadataBaseUri = [Environment]::GetEnvironmentVariable("CERT_METADATA_BASE_URI")

if ([string]::IsNullOrWhiteSpace($metadataBaseUri)) {
  $metadataBaseUri = "https://baselearn.vercel.app/certificates/"
}

$rpcUrl = if ($Network -eq "base-sepolia") {
  Require-Env "BASE_SEPOLIA_RPC_URL"
} else {
  Require-Env "BASE_RPC_URL"
}

Write-Host "Deploying LearnBaseCertificate to $Network..."
$deployOutput = & $forgeCmd create `
  "contracts/LearnBaseCertificate.sol:LearnBaseCertificate" `
  --rpc-url $rpcUrl `
  --private-key $privateKey `
  --constructor-args $metadataBaseUri $admin $issuer $pauser 2>&1

if ($LASTEXITCODE -ne 0) {
  throw "forge create failed.`n$($deployOutput | Out-String)"
}

$deployText = $deployOutput | Out-String
$match = [regex]::Match($deployText, "Deployed to:\s*(0x[a-fA-F0-9]{40})")

if (-not $match.Success) {
  throw "Could not parse deployed contract address from forge output.`n$deployText"
}

$contractAddress = $match.Groups[1].Value
$certificateTypeIds = @(1, 2, 3, 4, 5)

foreach ($certificateTypeId in $certificateTypeIds) {
  Write-Host "Enabling certificate type $certificateTypeId..."
  & $castCmd send `
    $contractAddress `
    "setCertificateType(uint256,bool)" `
    $certificateTypeId `
    "true" `
    --rpc-url $rpcUrl `
    --private-key $privateKey | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Failed enabling certificate type ID $certificateTypeId."
  }
}

Write-Host "LearnBaseCertificate deployed: $contractAddress"
Write-Host "Metadata URI: $metadataBaseUri"
Write-Host "Enabled certificate IDs: $($certificateTypeIds -join ', ')"
Write-Host "Admin: $admin"
Write-Host "Issuer: $issuer"
Write-Host "Pauser: $pauser"
