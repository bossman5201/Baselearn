const { sendJson, readJsonBody, methodNotAllowed } = require("./_lib/http");
const {
  addAdminWithdrawLog,
  sanitizeWalletAddress,
  sanitizeTxHash,
  sanitizeWei,
  isStorageReady
} = require("./_lib/profile-store");
const { verifyWithdrawReceipt, getAdminWalletAddress } = require("./_lib/certificate-chain");
const { getBearerToken, verifyAuthToken } = require("./_lib/wallet-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  if (!isStorageReady()) {
    return sendJson(res, 503, {
      ok: false,
      error: "storage_not_ready"
    });
  }

  const body = readJsonBody(req);
  if (!body) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_json"
    });
  }

  const walletAddress = sanitizeWalletAddress(body.walletAddress);
  const toAddress = sanitizeWalletAddress(body.toAddress);
  const txHash = sanitizeTxHash(body.txHash);
  const amountWei = sanitizeWei(body.amountWei);
  const configuredAdminWallet = getAdminWalletAddress();

  if (!walletAddress || !toAddress || !txHash || !amountWei) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_payload"
    });
  }

  try {
    const token = getBearerToken(req);
    const tokenPayload = verifyAuthToken(token);
    if (tokenPayload.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error("auth_wallet_mismatch");
    }
  } catch (error) {
    return sendJson(res, 403, {
      ok: false,
      error: "invalid_wallet_auth",
      details: error.message
    });
  }

  if (!configuredAdminWallet || configuredAdminWallet.toLowerCase() !== walletAddress.toLowerCase()) {
    return sendJson(res, 403, {
      ok: false,
      error: "admin_wallet_required"
    });
  }

  try {
    await verifyWithdrawReceipt({
      txHash,
      expectedTo: toAddress,
      expectedAmountWei: amountWei
    });

    await addAdminWithdrawLog({
      walletAddress,
      txHash,
      amountWei,
      toAddress
    });

    return sendJson(res, 200, {
      ok: true
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: "withdraw_log_failed",
      details: error.message
    });
  }
};
