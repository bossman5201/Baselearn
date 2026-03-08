const { sendJson, methodNotAllowed } = require("./_lib/http");
const {
  addAdminWithdrawLog,
  addCertificateClaim,
  findProfileByWalletAddress,
  getSystemState,
  isStorageReady,
  sanitizeWalletAddress,
  setSystemState
} = require("./_lib/profile-store");
const { getCertificateConfigByTypeId } = require("./_lib/certificate-config");
const {
  getAdminWalletAddress,
  getCertificateIssuedLogs,
  getContractAddress,
  getLatestBlockNumber,
  getRevenueWithdrawnLogs
} = require("./_lib/certificate-chain");

const CURSOR_STATE_KEY = "chain_reconcile_cursor_v1";
const DEFAULT_CONFIRMATIONS = 2n;
const DEFAULT_BLOCK_RANGE = 1500n;
const DEFAULT_LOOKBACK_BLOCKS = 5000n;

function toBigIntOrNull(value) {
  if (typeof value === "bigint") {
    return value >= 0n ? value : null;
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return BigInt(value);
  }

  if (typeof value === "string" && /^[0-9]+$/.test(value.trim())) {
    return BigInt(value.trim());
  }

  return null;
}

function getEnvBigInt(name, fallback) {
  const parsed = toBigIntOrNull(process.env[name]);
  if (parsed === null) {
    return fallback;
  }

  return parsed;
}

function extractBearerToken(req) {
  const rawHeader = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof rawHeader === "string") {
    const match = rawHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }

  const cronHeader = req.headers?.["x-cron-secret"] || req.headers?.["X-Cron-Secret"] || "";
  return typeof cronHeader === "string" ? cronHeader.trim() : "";
}

function assertReconcileAuth(req) {
  const secret = (process.env.LEARN_BASE_RECONCILE_SECRET || process.env.CRON_SECRET || "").trim();
  if (!secret) {
    throw new Error("reconcile_secret_missing");
  }

  const provided = extractBearerToken(req);
  if (!provided || provided !== secret) {
    throw new Error("invalid_reconcile_auth");
  }
}

function sortLogsAscending(logs) {
  return [...logs].sort((left, right) => {
    const leftBlock = toBigIntOrNull(left?.blockNumber) || 0n;
    const rightBlock = toBigIntOrNull(right?.blockNumber) || 0n;
    if (leftBlock !== rightBlock) {
      return leftBlock < rightBlock ? -1 : 1;
    }

    const leftIndex = toBigIntOrNull(left?.logIndex) || 0n;
    const rightIndex = toBigIntOrNull(right?.logIndex) || 0n;
    if (leftIndex === rightIndex) {
      return 0;
    }

    return leftIndex < rightIndex ? -1 : 1;
  });
}

function initStats() {
  return {
    ranges: 0,
    certificateLogs: 0,
    withdrawLogs: 0,
    certificateClaimsInserted: 0,
    certificateClaimsSkippedUnknownType: 0,
    certificateClaimsSkippedNoProfile: 0,
    certificateClaimsSkippedAlreadyClaimed: 0,
    certificateClaimsSkippedInvalidLog: 0,
    withdrawLogsInserted: 0,
    withdrawLogsSkippedAlreadyLogged: 0,
    withdrawLogsSkippedInvalidLog: 0,
    errors: 0
  };
}

async function processIssuedLogs(logs, stats) {
  const orderedLogs = sortLogsAscending(logs);

  for (const log of orderedLogs) {
    stats.certificateLogs += 1;

    try {
      const learner = sanitizeWalletAddress(log?.args?.learner);
      const certificateTypeId = Number(log?.args?.certificateTypeId);
      const txHash = typeof log?.transactionHash === "string" ? log.transactionHash.trim() : "";

      if (!learner || !Number.isInteger(certificateTypeId) || certificateTypeId <= 0 || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
        stats.certificateClaimsSkippedInvalidLog += 1;
        continue;
      }

      const config = getCertificateConfigByTypeId(certificateTypeId);
      if (!config) {
        stats.certificateClaimsSkippedUnknownType += 1;
        continue;
      }

      const profile = await findProfileByWalletAddress(learner);
      if (!profile) {
        stats.certificateClaimsSkippedNoProfile += 1;
        continue;
      }

      if (profile.certificates?.[config.certificateId]) {
        stats.certificateClaimsSkippedAlreadyClaimed += 1;
        continue;
      }

      await addCertificateClaim({
        learnerId: profile.learnerId,
        certificateId: config.certificateId,
        certificateTypeId,
        paymentMode: "basepay",
        paymentRef: txHash,
        walletAddress: learner,
        paymentAmountWei: null
      });

      stats.certificateClaimsInserted += 1;
    } catch (error) {
      if (error.message === "certificate_already_claimed") {
        stats.certificateClaimsSkippedAlreadyClaimed += 1;
        continue;
      }

      stats.errors += 1;
    }
  }
}

async function processWithdrawLogs(logs, stats, adminWalletAddress) {
  if (!adminWalletAddress) {
    return;
  }

  const orderedLogs = sortLogsAscending(logs);

  for (const log of orderedLogs) {
    stats.withdrawLogs += 1;

    try {
      const toAddress = sanitizeWalletAddress(log?.args?.to);
      const txHash = typeof log?.transactionHash === "string" ? log.transactionHash.trim() : "";
      const amountWei = log?.args?.amountWei !== undefined && log?.args?.amountWei !== null
        ? String(log.args.amountWei)
        : "";

      if (!toAddress || !/^0x[a-fA-F0-9]{64}$/.test(txHash) || !/^[0-9]+$/.test(amountWei)) {
        stats.withdrawLogsSkippedInvalidLog += 1;
        continue;
      }

      const inserted = await addAdminWithdrawLog({
        walletAddress: adminWalletAddress,
        txHash,
        amountWei,
        toAddress
      });

      if (inserted) {
        stats.withdrawLogsInserted += 1;
      } else {
        stats.withdrawLogsSkippedAlreadyLogged += 1;
      }
    } catch {
      stats.errors += 1;
    }
  }
}

async function getStartBlock(latestBlock) {
  const cursor = await getSystemState(CURSOR_STATE_KEY);
  const previousBlock = toBigIntOrNull(cursor?.lastProcessedBlock);
  if (previousBlock !== null) {
    return {
      startBlock: previousBlock + 1n,
      source: "cursor"
    };
  }

  const configuredStart = toBigIntOrNull(process.env.CERTIFICATE_RECONCILE_START_BLOCK);
  if (configuredStart !== null) {
    return {
      startBlock: configuredStart,
      source: "env_start_block"
    };
  }

  const lookback = getEnvBigInt("CHAIN_RECONCILE_LOOKBACK_BLOCKS", DEFAULT_LOOKBACK_BLOCKS);
  return {
    startBlock: latestBlock > lookback ? latestBlock - lookback : 0n,
    source: "lookback"
  };
}

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    return methodNotAllowed(res, ["GET", "POST"]);
  }

  try {
    assertReconcileAuth(req);
  } catch (error) {
    const statusCode = error.message === "reconcile_secret_missing" ? 503 : 403;
    return sendJson(res, statusCode, {
      ok: false,
      error: error.message
    });
  }

  if (!isStorageReady()) {
    return sendJson(res, 503, {
      ok: false,
      error: "storage_not_ready"
    });
  }

  if (!getContractAddress()) {
    return sendJson(res, 503, {
      ok: false,
      error: "certificate_contract_not_configured"
    });
  }

  const stats = initStats();
  const confirmations = getEnvBigInt("CHAIN_RECONCILE_CONFIRMATIONS", DEFAULT_CONFIRMATIONS);
  const maxRange = getEnvBigInt("CHAIN_RECONCILE_MAX_BLOCK_RANGE", DEFAULT_BLOCK_RANGE) || DEFAULT_BLOCK_RANGE;
  const adminWalletAddress = getAdminWalletAddress();

  try {
    const latestBlock = toBigIntOrNull(await getLatestBlockNumber()) || 0n;
    const safeTargetBlock = latestBlock > confirmations ? latestBlock - confirmations : 0n;
    const { startBlock, source } = await getStartBlock(latestBlock);

    if (startBlock > safeTargetBlock) {
      return sendJson(res, 200, {
        ok: true,
        message: "nothing_to_reconcile",
        startBlock: startBlock.toString(),
        targetBlock: safeTargetBlock.toString(),
        cursorSource: source,
        stats
      });
    }

    let fromBlock = startBlock;
    let lastProcessedBlock = startBlock - 1n;
    while (fromBlock <= safeTargetBlock) {
      const toBlock = fromBlock + maxRange - 1n < safeTargetBlock
        ? fromBlock + maxRange - 1n
        : safeTargetBlock;

      const [issuedLogs, withdrawnLogs] = await Promise.all([
        getCertificateIssuedLogs({
          fromBlock: fromBlock.toString(),
          toBlock: toBlock.toString()
        }),
        getRevenueWithdrawnLogs({
          fromBlock: fromBlock.toString(),
          toBlock: toBlock.toString()
        })
      ]);

      stats.ranges += 1;
      await processIssuedLogs(issuedLogs, stats);
      await processWithdrawLogs(withdrawnLogs, stats, adminWalletAddress);

      lastProcessedBlock = toBlock;
      fromBlock = toBlock + 1n;
    }

    if (stats.errors > 0) {
      return sendJson(res, 500, {
        ok: false,
        error: "chain_reconcile_partial_failure",
        startBlock: startBlock.toString(),
        targetBlock: safeTargetBlock.toString(),
        lastProcessedBlock: lastProcessedBlock.toString(),
        stats
      });
    }

    await setSystemState(CURSOR_STATE_KEY, {
      lastProcessedBlock: lastProcessedBlock.toString(),
      updatedAt: new Date().toISOString()
    });

    return sendJson(res, 200, {
      ok: true,
      startBlock: startBlock.toString(),
      targetBlock: safeTargetBlock.toString(),
      lastProcessedBlock: lastProcessedBlock.toString(),
      cursorSource: source,
      stats
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "chain_reconcile_failed",
      details: error.message
    });
  }
};
