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
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }

  return $value.Trim()
}

function Require-AddressEnv([string]$Name) {
  $value = Require-Env $Name
  if ($value -notmatch "^0x[a-fA-F0-9]{40}$") {
    throw "Invalid address in $Name: $value"
  }

  return $value
}

function Get-SignerArgs() {
  $account = [Environment]::GetEnvironmentVariable("FOUNDRY_ACCOUNT")
  if (-not [string]::IsNullOrWhiteSpace($account)) {
    return @("--account", $account.Trim())
  }

  $privateKey = Require-Env "PRIVATE_KEY"
  return @("--private-key", $privateKey)
}

function Assert-ChainId([string]$CastCmd, [string]$RpcUrl, [string]$Network) {
  $expectedChainId = if ($Network -eq "base") { 8453 } else { 84532 }
  $chainIdOutput = & $CastCmd chain-id --rpc-url $RpcUrl 2>&1

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read chain ID from RPC.`n$($chainIdOutput | Out-String)"
  }

  $chainIdText = ($chainIdOutput | Out-String).Trim()
  [int64]$actualChainId = 0
  if (-not [int64]::TryParse($chainIdText, [ref]$actualChainId)) {
    throw "Could not parse chain ID output: $chainIdText"
  }

  if ($actualChainId -ne $expectedChainId) {
    throw "RPC chain ID mismatch. Expected $expectedChainId for '$Network', got $actualChainId."
  }
}

function Load-CertificateConfigs([string]$ConfigPath) {
  if (-not (Test-Path $ConfigPath)) {
    throw "Certificate type config not found: $ConfigPath"
  }

  $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  if (-not $config) {
    throw "Certificate type config is empty: $ConfigPath"
  }

  $entries = @()
  foreach ($entry in $config) {
    if (-not $entry.certificateId) {
      throw "Certificate config entry missing certificateId."
    }

    $typeId = [int]$entry.typeId
    if ($typeId -le 0) {
      throw "Invalid typeId in certificate config for $($entry.certificateId)."
    }

    $priceWeiText = [string]$entry.priceWei
    if ([string]::IsNullOrWhiteSpace($priceWeiText) -or ($priceWeiText -notmatch "^[0-9]+$")) {
      throw "Invalid priceWei in certificate config for $($entry.certificateId)."
    }

    [System.Numerics.BigInteger]$priceWei = [System.Numerics.BigInteger]::Zero
    if (-not [System.Numerics.BigInteger]::TryParse($priceWeiText, [ref]$priceWei) -or $priceWei -le 0) {
      throw "Invalid priceWei value in certificate config for $($entry.certificateId)."
    }

    $entries += [PSCustomObject]@{
      CertificateId = [string]$entry.certificateId
      TypeId = $typeId
      PriceWei = $priceWeiText
    }
  }

  if ($entries.Count -eq 0) {
    throw "No certificate type IDs found in config."
  }

  $duplicateTypeIds = $entries | Group-Object TypeId | Where-Object { $_.Count -gt 1 }
  if ($duplicateTypeIds) {
    throw "Duplicate typeId values found in certificate config."
  }

  return ,$entries
}

Load-DotEnv

$forgeCmd = Require-Command "forge"
$castCmd = Require-Command "cast"
$signerArgs = Get-SignerArgs

$admin = Require-AddressEnv "CONTRACT_ADMIN_WALLET"
$issuer = Require-AddressEnv "CONTRACT_ISSUER_WALLET"
$pauser = Require-AddressEnv "CONTRACT_PAUSER_WALLET"

$uniqueWallets = @($admin.ToLower(), $issuer.ToLower(), $pauser.ToLower()) | Sort-Object -Unique
if ($uniqueWallets.Count -ne 3) {
  Write-Warning "Admin/issuer/pauser wallets overlap. Allowed by config, but higher operational risk."
}

$metadataBaseUri = [Environment]::GetEnvironmentVariable("CERT_METADATA_BASE_URI")
if ([string]::IsNullOrWhiteSpace($metadataBaseUri)) {
  $metadataBaseUri = "https://baselearn.vercel.app/certificates/"
}

$rpcUrl = if ($Network -eq "base-sepolia") {
  Require-Env "BASE_SEPOLIA_RPC_URL"
} else {
  Require-Env "BASE_RPC_URL"
}

Assert-ChainId -CastCmd $castCmd -RpcUrl $rpcUrl -Network $Network

$certificateConfigPath = Join-Path $PSScriptRoot "..\certificates\certificate-types.json"
$certificateConfigs = Load-CertificateConfigs $certificateConfigPath

Write-Host "Deploying LearnBaseCertificate to $Network..."
$deployArgs = @(
  "create",
  "contracts/LearnBaseCertificate.sol:LearnBaseCertificate",
  "--rpc-url",
  $rpcUrl
)
$deployArgs += $signerArgs
$deployArgs += @(
  "--constructor-args",
  $metadataBaseUri,
  $admin,
  $issuer,
  $pauser
)

$deployOutput = & $forgeCmd @deployArgs 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "forge create failed.`n$($deployOutput | Out-String)"
}

$deployText = $deployOutput | Out-String
$match = [regex]::Match($deployText, "Deployed to:\s*(0x[a-fA-F0-9]{40})")
if (-not $match.Success) {
  throw "Could not parse deployed contract address from forge output.`n$deployText"
}

$contractAddress = $match.Groups[1].Value

foreach ($certificate in $certificateConfigs) {
  $certificateTypeId = $certificate.TypeId
  $certificatePriceWei = $certificate.PriceWei
  Write-Host "Enabling certificate type $certificateTypeId..."
  $castArgs = @(
    "send",
    $contractAddress,
    "setCertificateType(uint256,bool)",
    $certificateTypeId,
    "true",
    "--rpc-url",
    $rpcUrl
  )
  $castArgs += $signerArgs

  & $castCmd @castArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed enabling certificate type ID $certificateTypeId."
  }

  Write-Host "Setting price for type $certificateTypeId to $certificatePriceWei wei..."
  $priceArgs = @(
    "send",
    $contractAddress,
    "setCertificatePrice(uint256,uint256)",
    $certificateTypeId,
    $certificatePriceWei,
    "--rpc-url",
    $rpcUrl
  )
  $priceArgs += $signerArgs

  & $castCmd @priceArgs | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed setting price for certificate type ID $certificateTypeId."
  }
}

Write-Host "LearnBaseCertificate deployed: $contractAddress"
Write-Host "Metadata URI: $metadataBaseUri"
Write-Host "Enabled certificate IDs: $($certificateConfigs.TypeId -join ', ')"
Write-Host "Admin: $admin"
Write-Host "Issuer: $issuer"
Write-Host "Pauser: $pauser"
