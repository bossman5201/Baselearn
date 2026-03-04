const { sendJson, readJsonBody, methodNotAllowed, validateRequiredString } = require("./_lib/http");
const { addCertificateClaim, sanitizeLearnerId, isStorageReady } = require("./_lib/profile-store");

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

  try {
    const profile = await addCertificateClaim({
      learnerId,
      certificateId: body.certificateId,
      paymentMode: body.paymentMode,
      paymentRef: body.paymentRef
    });

    return sendJson(res, 200, {
      ok: true,
      profile
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "certificate_claim_failed",
      details: error.message
    });
  }
};
