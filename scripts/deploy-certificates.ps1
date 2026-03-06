param(
  [ValidateSet("base-sepolia", "base")]
  [string]$Network = "base-sepolia"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Require-Env([string]$Name) {
  $Value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required environment variable: $Name"
  }

  return $Value.Trim()
}

Require-Command "forge"
Require-Command "cast"

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
$deployOutput = & forge create `
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
  & cast send `
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
