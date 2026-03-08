const { sendJson, readJsonBody, methodNotAllowed } = require("./_lib/http");
const { sanitizeWalletAddress, sanitizeWei } = require("./_lib/profile-store");
const { buildWithdrawTx, getAdminWalletAddress } = require("./_lib/certificate-chain");
const { getBearerToken, verifyAuthToken } = require("./_lib/wallet-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  const body = readJsonBody(req);
  if (!body) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_json"
    });
  }

  const connectedWallet = sanitizeWalletAddress(body.walletAddress);
  const configuredAdminWallet = getAdminWalletAddress();
  const amountWei = sanitizeWei(body.amountWei);
  const toAddress = sanitizeWalletAddress(body.toAddress) || configuredAdminWallet;

  if (!connectedWallet) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_wallet_address"
    });
  }

  try {
    const token = getBearerToken(req);
    const tokenPayload = verifyAuthToken(token);
    if (tokenPayload.walletAddress.toLowerCase() !== connectedWallet.toLowerCase()) {
      throw new Error("auth_wallet_mismatch");
    }
  } catch (error) {
    return sendJson(res, 403, {
      ok: false,
      error: "invalid_wallet_auth",
      details: error.message
    });
  }

  if (!configuredAdminWallet) {
    return sendJson(res, 503, {
      ok: false,
      error: "admin_wallet_not_configured"
    });
  }

  if (configuredAdminWallet.toLowerCase() !== connectedWallet.toLowerCase()) {
    return sendJson(res, 403, {
      ok: false,
      error: "admin_wallet_required"
    });
  }

  if (!amountWei) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_withdraw_amount"
    });
  }

  try {
    const intent = await buildWithdrawTx({
      to: toAddress,
      amountWei
    });

    return sendJson(res, 200, {
      ok: true,
      intent
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: "withdraw_intent_failed",
      details: error.message
    });
  }
};
