const crypto = require("crypto");
const { getAddress, verifyMessage } = require("viem");
const { sanitizeLearnerId, sanitizeWalletAddress } = require("./profile-store");

const MAX_AUTH_WINDOW_SECONDS = Number.parseInt(process.env.LEARN_BASE_AUTH_MAX_WINDOW_SECONDS || "600", 10);
const AUTH_CLOCK_SKEW_SECONDS = 120;

function getAuthSecret() {
  const secret = (process.env.LEARN_BASE_AUTH_SECRET || process.env.LEARN_BASE_ADMIN_TOKEN || "").trim();
  if (!secret) {
    throw new Error("auth_secret_missing");
  }

  return secret;
}

function parseIsoDate(value) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function buildWalletAuthMessage({ learnerId, walletAddress, issuedAt, expiresAt }) {
  const safeLearnerId = sanitizeLearnerId(learnerId);
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeLearnerId || !safeWalletAddress) {
    throw new Error("invalid_auth_payload");
  }

  return [
    "Learn Base Wallet Authentication",
    `learner_id:${safeLearnerId}`,
    `wallet:${safeWalletAddress.toLowerCase()}`,
    `issued_at:${issuedAt}`,
    `expires_at:${expiresAt}`
  ].join("\n");
}

async function verifyWalletAuthSignature({ learnerId, walletAddress, issuedAt, expiresAt, signature }) {
  const safeLearnerId = sanitizeLearnerId(learnerId);
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeLearnerId || !safeWalletAddress) {
    throw new Error("invalid_auth_payload");
  }

  const issuedAtMs = parseIsoDate(issuedAt);
  const expiresAtMs = parseIsoDate(expiresAt);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
    throw new Error("invalid_auth_timestamps");
  }

  if (expiresAtMs <= issuedAtMs) {
    throw new Error("invalid_auth_window");
  }

  const windowSeconds = Math.floor((expiresAtMs - issuedAtMs) / 1000);
  if (windowSeconds > MAX_AUTH_WINDOW_SECONDS) {
    throw new Error("auth_window_too_large");
  }

  const now = Date.now();
  if (now < issuedAtMs - AUTH_CLOCK_SKEW_SECONDS * 1000) {
    throw new Error("auth_not_yet_valid");
  }

  if (now > expiresAtMs) {
    throw new Error("auth_expired");
  }

  if (typeof signature !== "string" || !/^0x[a-fA-F0-9]{130}$/.test(signature.trim())) {
    throw new Error("invalid_auth_signature");
  }

  const message = buildWalletAuthMessage({
    learnerId: safeLearnerId,
    walletAddress: safeWalletAddress,
    issuedAt,
    expiresAt
  });

  const valid = await verifyMessage({
    address: safeWalletAddress,
    message,
    signature: signature.trim()
  });

  if (!valid) {
    throw new Error("invalid_auth_signature");
  }

  return {
    learnerId: safeLearnerId,
    walletAddress: getAddress(safeWalletAddress),
    issuedAt,
    expiresAt
  };
}

function signAuthToken({ learnerId, walletAddress, expiresAt }) {
  const safeLearnerId = sanitizeLearnerId(learnerId);
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeLearnerId || !safeWalletAddress) {
    throw new Error("invalid_auth_payload");
  }

  const expiresAtMs = parseIsoDate(expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    throw new Error("invalid_auth_window");
  }

  const payload = {
    learnerId: safeLearnerId,
    walletAddress: getAddress(safeWalletAddress),
    exp: Math.floor(expiresAtMs / 1000)
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

function verifyAuthToken(token) {
  if (typeof token !== "string" || token.trim().length === 0) {
    throw new Error("auth_token_missing");
  }

  const parts = token.trim().split(".");
  if (parts.length !== 2) {
    throw new Error("invalid_auth_token");
  }

  const [encodedPayload, encodedSignature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", getAuthSecret())
    .update(encodedPayload)
    .digest("base64url");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(encodedSignature, "utf8");
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new Error("invalid_auth_token");
  }

  let payload = null;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    throw new Error("invalid_auth_token");
  }

  const learnerId = sanitizeLearnerId(payload.learnerId);
  const walletAddress = sanitizeWalletAddress(payload.walletAddress);
  const exp = Number(payload.exp);

  if (!learnerId || !walletAddress || !Number.isInteger(exp)) {
    throw new Error("invalid_auth_token");
  }

  if (Math.floor(Date.now() / 1000) >= exp) {
    throw new Error("auth_token_expired");
  }

  return {
    learnerId,
    walletAddress: getAddress(walletAddress),
    exp
  };
}

function getBearerToken(req) {
  const rawAuthHeader = req.headers?.authorization || req.headers?.Authorization || "";
  if (typeof rawAuthHeader !== "string") {
    return "";
  }

  const match = rawAuthHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return "";
  }

  return match[1].trim();
}

function assertTokenWalletAndLearner(tokenPayload, learnerId, walletAddress) {
  const safeLearnerId = sanitizeLearnerId(learnerId);
  const safeWalletAddress = sanitizeWalletAddress(walletAddress);
  if (!safeLearnerId || !safeWalletAddress) {
    throw new Error("invalid_auth_payload");
  }

  if (tokenPayload.learnerId !== safeLearnerId) {
    throw new Error("auth_learner_mismatch");
  }

  if (tokenPayload.walletAddress.toLowerCase() !== safeWalletAddress.toLowerCase()) {
    throw new Error("auth_wallet_mismatch");
  }
}

module.exports = {
  buildWalletAuthMessage,
  verifyWalletAuthSignature,
  signAuthToken,
  verifyAuthToken,
  getBearerToken,
  assertTokenWalletAndLearner
};
