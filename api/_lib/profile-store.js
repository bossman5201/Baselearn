const { kv } = require("@vercel/kv");

const LESSON_KEY_PREFIX = "learnbase:profile:";

function isStorageReady() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function sanitizeLearnerId(rawLearnerId) {
  if (typeof rawLearnerId !== "string") {
    return "";
  }

  const normalized = rawLearnerId.trim().toLowerCase();
  const safe = normalized.replace(/[^a-z0-9_-]/g, "");

  if (safe.length < 3 || safe.length > 40) {
    return "";
  }

  return safe;
}

function getProfileKey(learnerId) {
  return `${LESSON_KEY_PREFIX}${learnerId}`;
}

function createEmptyProfile(learnerId) {
  return {
    learnerId,
    lessons: {},
    certificates: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function getProfile(learnerId) {
  const safeLearnerId = sanitizeLearnerId(learnerId);
  if (!safeLearnerId) {
    throw new Error("invalid_learner_id");
  }

  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  const key = getProfileKey(safeLearnerId);
  const existing = await kv.get(key);

  if (!existing) {
    return createEmptyProfile(safeLearnerId);
  }

  return {
    ...createEmptyProfile(safeLearnerId),
    ...existing,
    learnerId: safeLearnerId,
    lessons: existing.lessons || {},
    certificates: existing.certificates || {}
  };
}

async function saveProfile(profile) {
  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  const learnerId = sanitizeLearnerId(profile.learnerId);
  if (!learnerId) {
    throw new Error("invalid_learner_id");
  }

  const key = getProfileKey(learnerId);
  const nowIso = new Date().toISOString();

  const cleanProfile = {
    ...createEmptyProfile(learnerId),
    ...profile,
    learnerId,
    lessons: profile.lessons || {},
    certificates: profile.certificates || {},
    updatedAt: nowIso,
    createdAt: profile.createdAt || nowIso
  };

  await kv.set(key, cleanProfile);
  return cleanProfile;
}

async function upsertLessonProgress({ learnerId, lessonId, score, passed }) {
  const profile = await getProfile(learnerId);
  const existing = profile.lessons[lessonId] || { attempts: 0, passed: false };
  const nowIso = new Date().toISOString();

  profile.lessons[lessonId] = {
    attempts: Number(existing.attempts || 0) + 1,
    score: Number(score || 0),
    passed: Boolean(passed),
    completedAt: passed ? nowIso : existing.completedAt || null
  };

  return saveProfile(profile);
}

async function addCertificateClaim({ learnerId, certificateId, paymentMode, paymentRef }) {
  const profile = await getProfile(learnerId);

  profile.certificates[certificateId] = {
    claimedAt: new Date().toISOString(),
    paymentMode: paymentMode || "demo",
    paymentRef: paymentRef || null
  };

  return saveProfile(profile);
}

module.exports = {
  isStorageReady,
  sanitizeLearnerId,
  getProfile,
  upsertLessonProgress,
  addCertificateClaim
};
