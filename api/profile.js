const { sendJson, methodNotAllowed } = require("./_lib/http");
const { getProfile, sanitizeLearnerId, isStorageReady } = require("./_lib/profile-store");

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
  if (!learnerId) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_id"
    });
  }

  try {
    const profile = await getProfile(learnerId);
    return sendJson(res, 200, {
      ok: true,
      profile
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "profile_fetch_failed",
      details: error.message
    });
  }
};
