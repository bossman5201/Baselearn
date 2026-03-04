const { sendJson, readJsonBody, methodNotAllowed, validateRequiredString } = require("./_lib/http");
const { upsertLessonProgress, sanitizeLearnerId, isStorageReady } = require("./_lib/profile-store");

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
  const lessonIdError = validateRequiredString(body.lessonId, "lessonId");

  if (!learnerId) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_id"
    });
  }

  if (lessonIdError) {
    return sendJson(res, 400, {
      ok: false,
      error: lessonIdError
    });
  }

  const score = Number(body.score || 0);
  const passed = Boolean(body.passed);

  try {
    const profile = await upsertLessonProgress({
      learnerId,
      lessonId: body.lessonId,
      score,
      passed
    });

    return sendJson(res, 200, {
      ok: true,
      profile
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "progress_save_failed",
      details: error.message
    });
  }
};
