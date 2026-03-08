const { sendJson, readJsonBody, methodNotAllowed } = require("./_lib/http");
const { assertLearnerSecret, bindLearnerWallet, isStorageReady } = require("./_lib/profile-store");
const { verifyWalletAuthSignature, signAuthToken } = require("./_lib/wallet-auth");

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

  try {
    await assertLearnerSecret({
      learnerId: body.learnerId,
      learnerSecret: body.learnerSecret,
      allowInitialize: false
    });

    const verified = await verifyWalletAuthSignature({
      learnerId: body.learnerId,
      walletAddress: body.walletAddress,
      issuedAt: body.issuedAt,
      expiresAt: body.expiresAt,
      signature: body.signature
    });

    const profile = await bindLearnerWallet({
      learnerId: verified.learnerId,
      walletAddress: verified.walletAddress
    });

    const token = signAuthToken({
      learnerId: verified.learnerId,
      walletAddress: verified.walletAddress,
      expiresAt: verified.expiresAt
    });

    return sendJson(res, 200, {
      ok: true,
      token,
      walletAddress: verified.walletAddress,
      learnerId: verified.learnerId,
      profile
    });
  } catch (error) {
    const knownErrors = new Set([
      "auth_secret_missing",
      "invalid_auth_payload",
      "invalid_auth_timestamps",
      "invalid_auth_window",
      "auth_window_too_large",
      "auth_not_yet_valid",
      "auth_expired",
      "invalid_auth_signature",
      "invalid_learner_secret",
      "learner_secret_not_initialized",
      "learner_secret_mismatch",
      "learner_wallet_mismatch",
      "invalid_wallet_address"
    ]);

    const statusCode = knownErrors.has(error.message) ? 400 : 500;
    return sendJson(res, statusCode, {
      ok: false,
      error: knownErrors.has(error.message) ? error.message : "auth_wallet_failed",
      details: knownErrors.has(error.message) ? undefined : error.message
    });
  }
};
