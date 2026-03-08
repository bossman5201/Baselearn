const { sendJson, readJsonBody, methodNotAllowed, validateRequiredString } = require("./_lib/http");
const {
  assertLearnerSecret,
  assertLearnerWalletMatch,
  sanitizeLearnerId,
  sanitizeLearnerSecret,
  sanitizeWalletAddress,
  isStorageReady
} = require("./_lib/profile-store");
const {
  getCertificateConfig,
  isSupportedCertificateId,
  isProfileEligibleForCertificate
} = require("./_lib/certificate-config");
const { buildClaimQuote, isConfiguredForClaims } = require("./_lib/certificate-chain");
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

  if (!isConfiguredForClaims()) {
    return sendJson(res, 503, {
      ok: false,
      error: "contract_claims_not_configured"
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
  const walletAddress = sanitizeWalletAddress(body.walletAddress);
  const certError = validateRequiredString(body.certificateId, "certificateId");

  if (!learnerId) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_id"
    });
  }

  if (!walletAddress) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_wallet_address"
    });
  }

  if (!learnerSecret) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_secret"
    });
  }

  if (certError) {
    return sendJson(res, 400, {
      ok: false,
      error: certError
    });
  }

  if (!isSupportedCertificateId(body.certificateId)) {
    return sendJson(res, 400, {
      ok: false,
      error: "unsupported_certificate_id"
    });
  }

  const certificateConfig = getCertificateConfig(body.certificateId);

  try {
    await assertLearnerSecret({
      learnerId,
      learnerSecret,
      allowInitialize: true
    });

    const token = getBearerToken(req);
    const tokenPayload = verifyAuthToken(token);
    assertTokenWalletAndLearner(tokenPayload, learnerId, walletAddress);

    const { profile } = await assertLearnerWalletMatch({
      learnerId,
      walletAddress
    });

    if (profile.certificates[body.certificateId]) {
      return sendJson(res, 409, {
        ok: false,
        error: "certificate_already_claimed"
      });
    }

    if (!isProfileEligibleForCertificate(profile, body.certificateId)) {
      return sendJson(res, 403, {
        ok: false,
        error: "certificate_not_eligible",
        requiredLessonIds: certificateConfig.requiredLessonIds
      });
    }

    const quote = await buildClaimQuote({
      walletAddress,
      certificateTypeId: certificateConfig.typeId
    });

    return sendJson(res, 200, {
      ok: true,
      quote: {
        ...quote,
        certificateId: body.certificateId
      }
    });
  } catch (error) {
    const known = new Set([
      "certificate_already_issued_onchain",
      "inactive_certificate_type",
      "certificate_price_not_set",
      "issuer_role_missing_on_contract",
      "certificate_signer_private_key_missing",
      "certificate_contract_not_configured",
      "auth_token_missing",
      "invalid_auth_token",
      "auth_token_expired",
      "auth_learner_mismatch",
      "auth_wallet_mismatch",
      "learner_wallet_not_bound",
      "learner_wallet_mismatch",
      "invalid_learner_secret",
      "learner_secret_not_initialized",
      "learner_secret_mismatch"
    ]);

    if (known.has(error.message)) {
      return sendJson(res, 400, {
        ok: false,
        error: error.message
      });
    }

    return sendJson(res, 500, {
      ok: false,
      error: "certificate_quote_failed",
      details: error.message
    });
  }
};
