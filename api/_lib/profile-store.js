const crypto = require("crypto");
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS learnbase_events (
      id BIGSERIAL PRIMARY KEY,
      learner_id TEXT,
      event_type TEXT NOT NULL,
      wallet_address TEXT,
      tx_hash TEXT,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS learnbase_events_learner_created_idx
      ON learnbase_events (learner_id, created_at DESC);
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS learnbase_events_event_type_created_idx
      ON learnbase_events (event_type, created_at DESC);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS learnbase_system_state (
      state_key TEXT PRIMARY KEY,
      state_value JSONB NOT NULL,
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

function sanitizeLearnerSecret(rawSecret) {
  if (typeof rawSecret !== "string") {
    return "";
  }

  const value = rawSecret.trim();
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(value)) {
    return "";
  }

  return value;
}

function hashLearnerSecret(learnerSecret) {
  const safeSecret = sanitizeLearnerSecret(learnerSecret);
  if (!safeSecret) {
    throw new Error("invalid_learner_secret");
  }

  return crypto.createHash("sha256").update(safeSecret, "utf8").digest("hex");
}

function sanitizeWalletAddress(rawAddress) {
  if (typeof rawAddress !== "string") {
    return "";
  }

  const value = rawAddress.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    return "";
  }

  return value;
}

function sanitizeTxHash(rawTxHash) {
  if (typeof rawTxHash !== "string") {
    return "";
  }

  const value = rawTxHash.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    return "";
  }

  return value;
}

function sanitizeWei(rawWei) {
  if (typeof rawWei !== "string" && typeof rawWei !== "number" && typeof rawWei !== "bigint") {
    return "";
  }

  const value = String(rawWei).trim();
  if (!/^[0-9]+$/.test(value)) {
    return "";
  }

  if (BigInt(value) <= 0n) {
    return "";
  }

  return value;
}

function createEmptyProfile(learnerId) {
  return {
    learnerId,
    learnerSecretHash: null,
    walletAddress: null,
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
    learnerSecretHash: existing.learnerSecretHash || null,
    walletAddress: existing.walletAddress || null,
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
  const learnerSecretHash = typeof profile.learnerSecretHash === "string" && /^[a-f0-9]{64}$/.test(profile.learnerSecretHash)
    ? profile.learnerSecretHash
    : null;
  const walletAddress = profile.walletAddress ? sanitizeWalletAddress(profile.walletAddress) : "";
  const cleanProfile = {
    ...createEmptyProfile(learnerId),
    ...profile,
    learnerId,
    learnerSecretHash,
    walletAddress: walletAddress || null,
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

async function appendEvent({ learnerId, eventType, walletAddress, txHash, payload }) {
  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  const safeEventType = typeof eventType === "string" ? eventType.trim().toLowerCase() : "";
  if (!safeEventType) {
    throw new Error("invalid_event_type");
  }

  const safeLearnerId = learnerId ? sanitizeLearnerId(learnerId) : "";
  const safeWalletAddress = walletAddress ? sanitizeWalletAddress(walletAddress) : "";
  const safeTxHash = txHash ? sanitizeTxHash(txHash) : "";
  const safePayload = payload && typeof payload === "object" ? payload : {};

  await ensureSchema();
  const db = getPool();

  await db.query(
    `
      INSERT INTO learnbase_events (learner_id, event_type, wallet_address, tx_hash, payload)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [
      safeLearnerId || null,
      safeEventType,
      safeWalletAddress || null,
      safeTxHash || null,
      JSON.stringify(safePayload)
    ]
  );
}

async function hasEventByTypeAndTxHash(eventType, txHash) {
  const safeEventType = typeof eventType === "string" ? eventType.trim().toLowerCase() : "";
  const safeTxHash = sanitizeTxHash(txHash);
  if (!safeEventType || !safeTxHash) {
    return false;
  }

  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  await ensureSchema();
  const db = getPool();
  const result = await db.query(
    `
      SELECT 1
      FROM learnbase_events
      WHERE event_type = $1
        AND tx_hash = $2
      LIMIT 1
    `,
    [safeEventType, safeTxHash]
  );

  return result.rows.length > 0;
}

async function upsertLessonProgress({ learnerId, lessonId, score, passed }) {
  const profile = await getProfile(learnerId);
  const existing = profile.lessons[lessonId] || { attempts: 0, passed: false };
  const nowIso = new Date().toISOString();
  const existingScore = Number(existing.score || 0);
  const incomingScore = Number(score || 0);
  const nextPassed = Boolean(existing.passed) || Boolean(passed);
  const completedAt = existing.completedAt || (nextPassed ? nowIso : null);

  profile.lessons[lessonId] = {
    attempts: Number(existing.attempts || 0) + 1,
    score: Math.max(existingScore, incomingScore),
    passed: nextPassed,
    lastAttemptAt: nowIso,
    completedAt
  };

  const savedProfile = await saveProfile(profile);

  await appendEvent({
    learnerId: savedProfile.learnerId,
    eventType: "lesson_progress",
    payload: {
      lessonId,
      score: Number(score || 0),
      passed: Boolean(passed),
      attempts: savedProfile.lessons[lessonId].attempts
    }
  });

  return savedProfile;
}

async function addCertificateClaim({
  learnerId,
  certificateId,
  certificateTypeId,
  paymentMode,
  paymentRef,
  walletAddress,
  paymentAmountWei
}) {
  const profile = await getProfile(learnerId);

  if (profile.certificates[certificateId]) {
    throw new Error("certificate_already_claimed");
  }

  const safeWalletAddress = walletAddress ? sanitizeWalletAddress(walletAddress) : "";
  const safePaymentRef = paymentRef ? sanitizeTxHash(paymentRef) : "";
  const safePaymentAmountWei = paymentAmountWei ? sanitizeWei(paymentAmountWei) : "";

  profile.certificates[certificateId] = {
    certificateTypeId: Number(certificateTypeId),
    claimedAt: new Date().toISOString(),
    paymentMode: paymentMode || "demo",
    paymentRef: safePaymentRef || null,
    walletAddress: safeWalletAddress || null,
    paymentAmountWei: safePaymentAmountWei || null
  };

  const savedProfile = await saveProfile(profile);

  await appendEvent({
    learnerId: savedProfile.learnerId,
    eventType: "certificate_claim",
    walletAddress: safeWalletAddress || null,
    txHash: safePaymentRef || null,
    payload: {
      certificateId,
      certificateTypeId: Number(certificateTypeId),
      paymentMode: paymentMode || "demo",
      paymentAmountWei: safePaymentAmountWei || null
    }
  });

  return savedProfile;
}

async function addAdminWithdrawLog({ walletAddress, txHash, amountWei, toAddress }) {
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  const safeToAddress = sanitizeWalletAddress(toAddress);
  const safeTxHash = sanitizeTxHash(txHash);
  const safeAmountWei = sanitizeWei(amountWei);

  if (!safeWalletAddress || !safeToAddress || !safeTxHash || !safeAmountWei) {
    throw new Error("invalid_withdraw_log");
  }

  const alreadyLogged = await hasEventByTypeAndTxHash("admin_withdraw", safeTxHash);
  if (alreadyLogged) {
    return false;
  }

  await appendEvent({
    eventType: "admin_withdraw",
    walletAddress: safeWalletAddress,
    txHash: safeTxHash,
    payload: {
      toAddress: safeToAddress,
      amountWei: safeAmountWei
    }
  });

  return true;
}

async function getSystemState(stateKey) {
  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  if (typeof stateKey !== "string" || stateKey.trim().length === 0) {
    throw new Error("invalid_state_key");
  }

  await ensureSchema();
  const db = getPool();
  const result = await db.query(
    `
      SELECT state_value
      FROM learnbase_system_state
      WHERE state_key = $1
      LIMIT 1
    `,
    [stateKey.trim()]
  );

  if (!result.rows.length) {
    return null;
  }

  return result.rows[0].state_value || null;
}

async function setSystemState(stateKey, stateValue) {
  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  if (typeof stateKey !== "string" || stateKey.trim().length === 0) {
    throw new Error("invalid_state_key");
  }

  const safeStateValue = stateValue && typeof stateValue === "object" ? stateValue : {};

  await ensureSchema();
  const db = getPool();
  await db.query(
    `
      INSERT INTO learnbase_system_state (state_key, state_value, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET
        state_value = EXCLUDED.state_value,
        updated_at = NOW()
    `,
    [stateKey.trim(), JSON.stringify(safeStateValue)]
  );
}

async function bindLearnerWallet({ learnerId, walletAddress }) {
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeWalletAddress) {
    throw new Error("invalid_wallet_address");
  }

  const profile = await getProfile(learnerId);
  const existingWallet = profile.walletAddress ? sanitizeWalletAddress(profile.walletAddress) : "";
  if (existingWallet && existingWallet.toLowerCase() !== safeWalletAddress.toLowerCase()) {
    throw new Error("learner_wallet_mismatch");
  }

  const isAlreadyBound = Boolean(existingWallet);
  profile.walletAddress = safeWalletAddress;
  const savedProfile = await saveProfile(profile);

  if (!isAlreadyBound) {
    await appendEvent({
      learnerId: savedProfile.learnerId,
      eventType: "wallet_bind",
      walletAddress: safeWalletAddress,
      payload: {}
    });
  }

  return savedProfile;
}

async function assertLearnerSecret({ learnerId, learnerSecret, allowInitialize = false }) {
  const safeLearnerSecret = sanitizeLearnerSecret(learnerSecret);
  if (!safeLearnerSecret) {
    throw new Error("invalid_learner_secret");
  }

  const profile = await getProfile(learnerId);
  const expectedHash = typeof profile.learnerSecretHash === "string" ? profile.learnerSecretHash : "";
  const providedHash = hashLearnerSecret(safeLearnerSecret);

  if (!expectedHash) {
    if (!allowInitialize) {
      throw new Error("learner_secret_not_initialized");
    }

    profile.learnerSecretHash = providedHash;
    const savedProfile = await saveProfile(profile);
    return {
      profile: savedProfile
    };
  }

  if (expectedHash !== providedHash) {
    throw new Error("learner_secret_mismatch");
  }

  return {
    profile
  };
}

async function assertLearnerWalletMatch({ learnerId, walletAddress, allowUnbound = false }) {
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeWalletAddress) {
    throw new Error("invalid_wallet_address");
  }

  const profile = await getProfile(learnerId);
  const boundWalletAddress = profile.walletAddress ? sanitizeWalletAddress(profile.walletAddress) : "";
  if (!boundWalletAddress) {
    if (allowUnbound) {
      return {
        profile,
        walletAddress: safeWalletAddress
      };
    }

    throw new Error("learner_wallet_not_bound");
  }

  if (boundWalletAddress.toLowerCase() !== safeWalletAddress.toLowerCase()) {
    throw new Error("learner_wallet_mismatch");
  }

  return {
    profile,
    walletAddress: boundWalletAddress
  };
}

async function findProfileByWalletAddress(walletAddress) {
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeWalletAddress) {
    throw new Error("invalid_wallet_address");
  }

  if (!isStorageReady()) {
    throw new Error("storage_not_ready");
  }

  await ensureSchema();
  const db = getPool();

  const result = await db.query(
    `
      SELECT learner_id, profile
      FROM learnbase_profiles
      WHERE LOWER(profile->>'walletAddress') = LOWER($1)
      LIMIT 1
    `,
    [safeWalletAddress]
  );

  if (!result.rows.length) {
    return null;
  }

  const learnerId = sanitizeLearnerId(result.rows[0].learner_id);
  if (!learnerId) {
    return null;
  }

  const existing = result.rows[0].profile || {};

  return {
    ...createEmptyProfile(learnerId),
    ...existing,
    learnerId,
    walletAddress: existing.walletAddress || safeWalletAddress,
    lessons: existing.lessons || {},
    certificates: existing.certificates || {}
  };
}

module.exports = {
  isStorageReady,
  sanitizeLearnerId,
  sanitizeLearnerSecret,
  sanitizeWalletAddress,
  sanitizeTxHash,
  sanitizeWei,
  getProfile,
  findProfileByWalletAddress,
  bindLearnerWallet,
  assertLearnerSecret,
  assertLearnerWalletMatch,
  upsertLessonProgress,
  addCertificateClaim,
  addAdminWithdrawLog,
  hasEventByTypeAndTxHash,
  getSystemState,
  setSystemState
};
