const {
  createPublicClient,
  decodeEventLog,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  parseAbiItem,
  stringToBytes
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { base, baseSepolia } = require("viem/chains");

const CONTRACT_ABI = parseAbi([
  "function nonces(address learner) view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function activeCertificateType(uint256 certificateTypeId) view returns (bool)",
  "function certificatePriceWei(uint256 certificateTypeId) view returns (uint256)",
  "function hasCertificate(address learner, uint256 certificateTypeId) view returns (bool)",
  "function claimCertificate(uint256 certificateTypeId, uint256 priceWei, uint256 nonce, uint256 deadline, bytes signature) payable",
  "function withdraw(address to, uint256 amountWei)",
  "function withdrawAll(address to)",
  "event CertificateIssued(address indexed learner, uint256 indexed certificateTypeId)",
  "event RevenueWithdrawn(address indexed to, uint256 amountWei)"
]);

const ISSUER_ROLE = keccak256(stringToBytes("ISSUER_ROLE"));
const DEFAULT_BASE_RPC_URL = "https://mainnet.base.org";
const DEFAULT_BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
const CLAIM_DEADLINE_SECONDS = 15 * 60;

let publicClient = null;
let cachedKey = "";

function getChainId() {
  const rawChainId = process.env.BASE_CHAIN_ID || "8453";
  const chainId = Number(rawChainId);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error("invalid_base_chain_id");
  }

  return chainId;
}

function getChainConfig(chainId) {
  if (chainId === baseSepolia.id) {
    return {
      ...baseSepolia,
      rpcUrls: {
        ...baseSepolia.rpcUrls,
        default: {
          http: [getBaseRpcUrl(chainId)]
        }
      }
    };
  }

  if (chainId !== base.id) {
    throw new Error("unsupported_chain_id");
  }

  return {
    ...base,
    rpcUrls: {
      ...base.rpcUrls,
      default: {
        http: [getBaseRpcUrl(chainId)]
      }
    }
  };
}

function getBaseRpcUrl(chainId = getChainId()) {
  if (chainId === baseSepolia.id) {
    return (
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.BASE_RPC_URL ||
      DEFAULT_BASE_SEPOLIA_RPC_URL
    );
  }

  return process.env.BASE_RPC_URL || DEFAULT_BASE_RPC_URL;
}

function getContractAddress() {
  const raw = process.env.CERTIFICATE_CONTRACT_ADDRESS || "";
  if (!raw || !isAddress(raw)) {
    return "";
  }

  return getAddress(raw);
}

function getAdminWalletAddress() {
  const raw = process.env.CONTRACT_ADMIN_WALLET || "";
  if (!raw || !isAddress(raw)) {
    return "";
  }

  return getAddress(raw);
}

function getIssuerAccount() {
  const raw = (process.env.CERTIFICATE_SIGNER_PRIVATE_KEY || process.env.PRIVATE_KEY || "").trim();
  if (!raw) {
    throw new Error("certificate_signer_private_key_missing");
  }

  const privateKey = raw.startsWith("0x") ? raw : `0x${raw}`;
  return privateKeyToAccount(privateKey);
}

function isConfiguredForClaims() {
  try {
    return Boolean(getContractAddress()) && Boolean(getIssuerAccount().address);
  } catch {
    return false;
  }
}

function getPublicClient() {
  const chainId = getChainId();
  const rpcUrl = getBaseRpcUrl(chainId);
  const cacheKey = `${chainId}:${rpcUrl}`;

  if (publicClient && cachedKey === cacheKey) {
    return publicClient;
  }

  const chain = getChainConfig(chainId);
  publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
  cachedKey = cacheKey;

  return publicClient;
}

function toChecksummedAddress(address, fieldName) {
  if (!isAddress(address)) {
    throw new Error(`invalid_${fieldName}`);
  }

  return getAddress(address);
}

async function assertIssuerRole(contractAddress, issuerAddress) {
  const client = getPublicClient();

  const hasRole = await client.readContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: "hasRole",
    args: [ISSUER_ROLE, issuerAddress]
  });

  if (!hasRole) {
    throw new Error("issuer_role_missing_on_contract");
  }
}

async function buildClaimQuote({ walletAddress, certificateTypeId }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const learner = toChecksummedAddress(walletAddress, "wallet_address");
  const typeId = Number(certificateTypeId);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new Error("invalid_certificate_type_id");
  }

  const client = getPublicClient();
  const issuer = getIssuerAccount();
  await assertIssuerRole(contractAddress, issuer.address);

  const [isActive, priceWei, nonce, alreadyIssued] = await Promise.all([
    client.readContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "activeCertificateType",
      args: [BigInt(typeId)]
    }),
    client.readContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "certificatePriceWei",
      args: [BigInt(typeId)]
    }),
    client.readContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "nonces",
      args: [learner]
    }),
    client.readContract({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: "hasCertificate",
      args: [learner, BigInt(typeId)]
    })
  ]);

  if (!isActive) {
    throw new Error("inactive_certificate_type");
  }

  if (priceWei <= 0n) {
    throw new Error("certificate_price_not_set");
  }

  if (alreadyIssued) {
    throw new Error("certificate_already_issued_onchain");
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + CLAIM_DEADLINE_SECONDS);
  const chainId = getChainId();

  const signature = await issuer.signTypedData({
    domain: {
      name: "LearnBaseCertificate",
      version: "1",
      chainId,
      verifyingContract: contractAddress
    },
    types: {
      CertificateClaim: [
        { name: "learner", type: "address" },
        { name: "certificateTypeId", type: "uint256" },
        { name: "priceWei", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    },
    primaryType: "CertificateClaim",
    message: {
      learner,
      certificateTypeId: BigInt(typeId),
      priceWei,
      nonce,
      deadline
    }
  });

  const data = encodeFunctionData({
    abi: CONTRACT_ABI,
    functionName: "claimCertificate",
    args: [BigInt(typeId), priceWei, nonce, deadline, signature]
  });

  return {
    chainId,
    contractAddress,
    learner,
    certificateTypeId: typeId,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    signature,
    priceWei: priceWei.toString(),
    txRequest: {
      to: contractAddress,
      data,
      value: `0x${priceWei.toString(16)}`
    }
  };
}

async function verifyClaimReceipt({ txHash, walletAddress, certificateTypeId, expectedPriceWei }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const learner = toChecksummedAddress(walletAddress, "wallet_address");
  const typeId = Number(certificateTypeId);
  if (!Number.isInteger(typeId) || typeId <= 0) {
    throw new Error("invalid_certificate_type_id");
  }

  const txHashValue = String(txHash || "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHashValue)) {
    throw new Error("invalid_transaction_hash");
  }

  const client = getPublicClient();
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: txHashValue }),
    client.getTransactionReceipt({ hash: txHashValue })
  ]);

  if (!tx || !receipt) {
    throw new Error("transaction_not_found");
  }

  if (receipt.status !== "success") {
    throw new Error("transaction_failed");
  }

  if (!tx.to || getAddress(tx.to) !== contractAddress) {
    throw new Error("transaction_wrong_target");
  }

  if (getAddress(tx.from) !== learner) {
    throw new Error("transaction_sender_mismatch");
  }

  if (expectedPriceWei !== undefined && expectedPriceWei !== null) {
    const expected = BigInt(String(expectedPriceWei));
    if (tx.value !== expected) {
      throw new Error("transaction_value_mismatch");
    }
  }

  const issuedEvent = receipt.logs.find((log) => {
    if (!log.address || getAddress(log.address) !== contractAddress) {
      return false;
    }

    try {
      const parsed = decodeEventLog({
        abi: CONTRACT_ABI,
        data: log.data,
        topics: log.topics
      });

      return (
        parsed.eventName === "CertificateIssued" &&
        getAddress(parsed.args.learner) === learner &&
        Number(parsed.args.certificateTypeId) === typeId
      );
    } catch {
      return false;
    }
  });

  if (!issuedEvent) {
    throw new Error("certificate_issue_event_missing");
  }

  return {
    chainId: getChainId(),
    contractAddress,
    txHash: txHashValue,
    blockNumber: receipt.blockNumber.toString()
  };
}

async function buildWithdrawTx({ to, amountWei }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const toAddress = toChecksummedAddress(to, "withdraw_to_address");
  const amount = BigInt(String(amountWei || "0"));
  if (amount <= 0n) {
    throw new Error("invalid_withdraw_amount");
  }

  const data = encodeFunctionData({
    abi: CONTRACT_ABI,
    functionName: "withdraw",
    args: [toAddress, amount]
  });

  return {
    chainId: getChainId(),
    contractAddress,
    toAddress,
    amountWei: amount.toString(),
    txRequest: {
      to: contractAddress,
      data,
      value: "0x0"
    }
  };
}

async function verifyWithdrawReceipt({ txHash, expectedTo, expectedAmountWei }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const txHashValue = String(txHash || "").trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHashValue)) {
    throw new Error("invalid_transaction_hash");
  }

  const expectedToAddress = toChecksummedAddress(expectedTo, "withdraw_to_address");
  const expectedAmount = BigInt(String(expectedAmountWei || "0"));
  if (expectedAmount <= 0n) {
    throw new Error("invalid_withdraw_amount");
  }

  const client = getPublicClient();
  const receipt = await client.getTransactionReceipt({ hash: txHashValue });
  if (!receipt || receipt.status !== "success") {
    throw new Error("transaction_failed");
  }

  const hasWithdrawEvent = receipt.logs.some((log) => {
    if (!log.address || getAddress(log.address) !== contractAddress) {
      return false;
    }

    try {
      const parsed = decodeEventLog({
        abi: CONTRACT_ABI,
        data: log.data,
        topics: log.topics
      });

      return (
        parsed.eventName === "RevenueWithdrawn" &&
        getAddress(parsed.args.to) === expectedToAddress &&
        BigInt(parsed.args.amountWei) === expectedAmount
      );
    } catch {
      return false;
    }
  });

  if (!hasWithdrawEvent) {
    throw new Error("withdraw_event_missing");
  }

  return {
    chainId: getChainId(),
    contractAddress,
    txHash: txHashValue,
    blockNumber: receipt.blockNumber.toString()
  };
}

async function getContractStatus() {
  const contractAddress = getContractAddress();
  const adminWallet = getAdminWalletAddress();
  const chainId = getChainId();

  if (!contractAddress) {
    return {
      configured: false,
      chainId,
      contractAddress: "",
      adminWallet
    };
  }

  const client = getPublicClient();
  const balanceWei = await client.getBalance({ address: contractAddress });

  return {
    configured: true,
    chainId,
    contractAddress,
    adminWallet,
    balanceWei: balanceWei.toString()
  };
}

async function getLatestBlockNumber() {
  const client = getPublicClient();
  return client.getBlockNumber();
}

async function getCertificateIssuedLogs({ fromBlock, toBlock }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const client = getPublicClient();
  return client.getLogs({
    address: contractAddress,
    event: parseAbiItem("event CertificateIssued(address indexed learner, uint256 indexed certificateTypeId)"),
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });
}

async function getRevenueWithdrawnLogs({ fromBlock, toBlock }) {
  const contractAddress = getContractAddress();
  if (!contractAddress) {
    throw new Error("certificate_contract_not_configured");
  }

  const client = getPublicClient();
  return client.getLogs({
    address: contractAddress,
    event: parseAbiItem("event RevenueWithdrawn(address indexed to, uint256 amountWei)"),
    fromBlock: BigInt(fromBlock),
    toBlock: BigInt(toBlock)
  });
}

module.exports = {
  isConfiguredForClaims,
  getChainId,
  getContractAddress,
  getAdminWalletAddress,
  getBaseRpcUrl,
  buildClaimQuote,
  verifyClaimReceipt,
  buildWithdrawTx,
  verifyWithdrawReceipt,
  getContractStatus,
  getLatestBlockNumber,
  getCertificateIssuedLogs,
  getRevenueWithdrawnLogs
};
