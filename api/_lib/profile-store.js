const { Pool } = require("pg");

let pool = null;
let schemaReady = false;

function getConnectionString() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function isStorageReady() {
  return Boolean(getConnectionString());
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString()
    });
  }

  return pool;
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS learnbase_profiles (
      learner_id TEXT PRIMARY KEY,
      profile JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  schemaReady = true;
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

  await ensureSchema();
  const db = getPool();

  const result = await db.query(
    "SELECT profile FROM learnbase_profiles WHERE learner_id = $1 LIMIT 1",
    [safeLearnerId]
  );

  if (!result.rows.length) {
    return createEmptyProfile(safeLearnerId);
  }

  const existing = result.rows[0].profile || {};

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

  await ensureSchema();
  const db = getPool();

  await db.query(
    `
      INSERT INTO learnbase_profiles (learner_id, profile, created_at, updated_at)
      VALUES ($1, $2::jsonb, NOW(), NOW())
      ON CONFLICT (learner_id)
      DO UPDATE SET
        profile = EXCLUDED.profile,
        updated_at = NOW()
    `,
    [learnerId, JSON.stringify(cleanProfile)]
  );

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
