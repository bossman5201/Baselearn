const { sendJson, methodNotAllowed } = require("./_lib/http");
const {
  assertLearnerSecret,
  sanitizeLearnerId,
  sanitizeLearnerSecret,
  isStorageReady
} = require("./_lib/profile-store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  if (!isStorageReady()) {
    return sendJson(res, 503, {
      ok: false,
      error: "storage_not_ready"
    });
  }

  const learnerId = sanitizeLearnerId(req.query.learnerId);
  const learnerSecret = sanitizeLearnerSecret(req.query.learnerSecret);
  if (!learnerId) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_id"
    });
  }

  if (!learnerSecret) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_secret"
    });
  }

  try {
    const { profile } = await assertLearnerSecret({
      learnerId,
      learnerSecret,
      allowInitialize: true
    });

    return sendJson(res, 200, {
      ok: true,
      profile
    });
  } catch (error) {
    const knownErrors = new Set([
      "invalid_learner_secret",
      "learner_secret_not_initialized",
      "learner_secret_mismatch"
    ]);

    if (knownErrors.has(error.message)) {
      return sendJson(res, 400, {
        ok: false,
        error: error.message
      });
    }

    return sendJson(res, 500, {
      ok: false,
      error: "profile_fetch_failed",
      details: error.message
    });
  }
};
