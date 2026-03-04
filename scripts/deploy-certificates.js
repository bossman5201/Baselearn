const { ethers } = require("hardhat");

function requiredAddress(name, value) {
  if (!value || !ethers.isAddress(value)) {
    throw new Error(`Missing or invalid ${name}`);
  }

  return value;
}

async function main() {
  const metadataBaseURI = process.env.CERT_METADATA_BASE_URI || "https://learnbase.app/certificates/";
  const admin = requiredAddress("CONTRACT_ADMIN_WALLET", process.env.CONTRACT_ADMIN_WALLET);
  const issuer = requiredAddress("CONTRACT_ISSUER_WALLET", process.env.CONTRACT_ISSUER_WALLET);
  const pauser = requiredAddress("CONTRACT_PAUSER_WALLET", process.env.CONTRACT_PAUSER_WALLET);

  const ContractFactory = await ethers.getContractFactory("LearnBaseCertificate");
  const contract = await ContractFactory.deploy(metadataBaseURI, admin, issuer, pauser);
  await contract.waitForDeployment();

  const certificateTypeIds = [1, 2, 3, 4, 5];
  for (const certificateTypeId of certificateTypeIds) {
    const tx = await contract.setCertificateType(certificateTypeId, true);
    await tx.wait();
  }

  const deployedAddress = await contract.getAddress();

  console.log("LearnBaseCertificate deployed:", deployedAddress);
  console.log("Metadata URI:", metadataBaseURI);
  console.log("Enabled certificate IDs:", certificateTypeIds.join(", "));
  console.log("Admin:", admin);
  console.log("Issuer:", issuer);
  console.log("Pauser:", pauser);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
