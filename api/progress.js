const { sendJson, readJsonBody, methodNotAllowed, validateRequiredString } = require("./_lib/http");
const {
  assertLearnerSecret,
  upsertLessonProgress,
  sanitizeLearnerId,
  sanitizeLearnerSecret,
  isStorageReady
} = require("./_lib/profile-store");
const { isSupportedLessonId } = require("./_lib/certificate-config");
const { gradeLessonQuiz } = require("./_lib/quiz-grader");

const QUIZ_RETRY_COOLDOWN_SECONDS = Number.parseInt(process.env.QUIZ_RETRY_COOLDOWN_SECONDS || "20", 10);

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

  if (!learnerSecret) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_learner_secret"
    });
  }

  if (!isSupportedLessonId(body.lessonId)) {
    return sendJson(res, 400, {
      ok: false,
      error: "unsupported_lesson_id"
    });
  }

  try {
    const { profile } = await assertLearnerSecret({
      learnerId,
      learnerSecret,
      allowInitialize: true
    });
    const existing = profile.lessons?.[body.lessonId];
    const lastAttemptAt = existing?.lastAttemptAt ? Date.parse(existing.lastAttemptAt) : NaN;

    if (Number.isFinite(lastAttemptAt)) {
      const secondsSinceLastAttempt = Math.floor((Date.now() - lastAttemptAt) / 1000);
      if (secondsSinceLastAttempt >= 0 && secondsSinceLastAttempt < QUIZ_RETRY_COOLDOWN_SECONDS) {
        return sendJson(res, 429, {
          ok: false,
          error: "quiz_retry_too_fast",
          retryAfterSeconds: QUIZ_RETRY_COOLDOWN_SECONDS - secondsSinceLastAttempt
        });
      }
    }

    const grade = gradeLessonQuiz(body.lessonId, body.answers);
    const updatedProfile = await upsertLessonProgress({
      learnerId,
      lessonId: body.lessonId,
      score: grade.score,
      passed: grade.passed
    });

    return sendJson(res, 200, {
      ok: true,
      profile: updatedProfile,
      result: grade
    });
  } catch (error) {
    const knownErrors = new Set([
      "invalid_quiz_answers",
      "unsupported_lesson_id",
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
      error: "progress_save_failed",
      details: error.message
    });
  }
};
