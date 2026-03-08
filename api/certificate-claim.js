const { sendJson, readJsonBody, methodNotAllowed, validateRequiredString } = require("./_lib/http");
const {
  addCertificateClaim,
  assertLearnerSecret,
  assertLearnerWalletMatch,
  getProfile,
  sanitizeLearnerId,
  sanitizeLearnerSecret,
  sanitizeWalletAddress,
  sanitizeTxHash,
  sanitizeWei,
  isStorageReady
} = require("./_lib/profile-store");
const { getCertificateTypeId, isSupportedCertificateId } = require("./_lib/certificate-config");
const { verifyClaimReceipt } = require("./_lib/certificate-chain");
const {
  assertTokenWalletAndLearner,
  getBearerToken,
  verifyAuthToken
} = require("./_lib/wallet-auth");

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

  const learnerId = sanitizeLearnerId(body.learnerId);
  const learnerSecret = sanitizeLearnerSecret(body.learnerSecret);
  const certError = validateRequiredString(body.certificateId, "certificateId");

  if (!learnerId) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_id"
    });
  }

  if (certError) {
    return sendJson(res, 400, {
      ok: false,
      error: certError
    });
  }

  if (!learnerSecret) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_secret"
    });
  }

  if (!isSupportedCertificateId(body.certificateId)) {
    return sendJson(res, 400, {
      ok: false,
      error: "unsupported_certificate_id"
    });
  }

  const canonicalTypeId = getCertificateTypeId(body.certificateId);
  let certificateTypeId = canonicalTypeId;

  if (body.certificateTypeId !== undefined) {
    const incomingTypeId = Number(body.certificateTypeId);
    if (!Number.isInteger(incomingTypeId) || incomingTypeId <= 0) {
      return sendJson(res, 400, {
        ok: false,
        error: "invalid_certificate_type_id"
      });
    }

    if (incomingTypeId !== canonicalTypeId) {
      return sendJson(res, 400, {
        ok: false,
        error: "certificate_type_mismatch"
      });
    }

    certificateTypeId = incomingTypeId;
  }

  const paymentMode = typeof body.paymentMode === "string" ? body.paymentMode.trim().toLowerCase() : "basepay";
  if (paymentMode !== "basepay") {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_payment_mode"
    });
  }

  const walletAddress = body.walletAddress ? sanitizeWalletAddress(body.walletAddress) : "";
  const paymentRef = body.paymentRef ? sanitizeTxHash(body.paymentRef) : "";
  const paymentAmountWei = body.paymentAmountWei ? sanitizeWei(body.paymentAmountWei) : "";

  try {
    await assertLearnerSecret({
      learnerId,
      learnerSecret,
      allowInitialize: true
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: error.message
    });
  }

  if (!walletAddress) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_wallet_address"
    });
  }

  if (!paymentRef) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_payment_ref"
    });
  }

  if (!paymentAmountWei) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_payment_amount"
    });
  }

  try {
    const token = getBearerToken(req);
    const tokenPayload = verifyAuthToken(token);
    assertTokenWalletAndLearner(tokenPayload, learnerId, walletAddress);
    await assertLearnerWalletMatch({
      learnerId,
      walletAddress
    });
  } catch (error) {
    return sendJson(res, 403, {
      ok: false,
      error: "invalid_wallet_auth",
      details: error.message
    });
  }

  try {
    await verifyClaimReceipt({
      txHash: paymentRef,
      walletAddress,
      certificateTypeId,
      expectedPriceWei: paymentAmountWei
    });
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_onchain_claim",
      details: error.message
    });
  }

  try {
    const currentProfile = await getProfile(learnerId);
    if (currentProfile.certificates?.[body.certificateId]) {
      return sendJson(res, 200, {
        ok: true,
        profile: currentProfile,
        idempotent: true
      });
    }

    const profile = await addCertificateClaim({
      learnerId,
      certificateId: body.certificateId,
      certificateTypeId,
      paymentMode,
      paymentRef,
      walletAddress,
      paymentAmountWei
    });

    return sendJson(res, 200, {
      ok: true,
      profile
    });
  } catch (error) {
    if (error.message === "certificate_already_claimed") {
      return sendJson(res, 409, {
        ok: false,
        error: "certificate_already_claimed"
      });
    }

    return sendJson(res, 500, {
      ok: false,
      error: "certificate_claim_failed",
      details: error.message
    });
  }
};
