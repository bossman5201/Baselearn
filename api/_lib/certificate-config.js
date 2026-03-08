const rawCertificateTypes = require("../../certificates/certificate-types.json");

const CERTIFICATE_CONFIGS = [];
const CERTIFICATE_ID_TO_CONFIG = new Map();
const TYPE_ID_TO_CONFIG = new Map();
const LESSON_ID_SET = new Set();
const TYPE_ID_SET = new Set();

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`invalid_${fieldName}`);
  }

  return value.trim();
}

function assertPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`invalid_${fieldName}`);
  }

  return parsed;
}

function assertPositiveWeiString(value, fieldName) {
  const asString = assertNonEmptyString(value, fieldName);
  if (!/^[0-9]+$/.test(asString)) {
    throw new Error(`invalid_${fieldName}`);
  }

  const asBigInt = BigInt(asString);
  if (asBigInt <= 0n) {
    throw new Error(`invalid_${fieldName}`);
  }

  return asBigInt.toString();
}

function assertLessonIds(value, fieldName) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`invalid_${fieldName}`);
  }

  const normalized = [];
  for (const rawLessonId of value) {
    const lessonId = assertNonEmptyString(rawLessonId, `${fieldName}_entry`).toUpperCase();
    if (!/^L([1-9]|1[0-9]|20)$/.test(lessonId)) {
      throw new Error(`invalid_${fieldName}_entry`);
    }

    normalized.push(lessonId);
    LESSON_ID_SET.add(lessonId);
  }

  return normalized;
}

for (const entry of rawCertificateTypes) {
  if (!entry || typeof entry !== "object") {
    throw new Error("invalid_certificate_config_entry");
  }

  const certificateId = assertNonEmptyString(entry.certificateId, "certificate_id");
  const typeId = assertPositiveInteger(entry.typeId, "certificate_type_id");
  const trackId = assertNonEmptyString(entry.trackId, "track_id");
  const priceWei = assertPositiveWeiString(entry.priceWei, "price_wei");
  const requiredLessonIds = assertLessonIds(entry.requiredLessonIds, "required_lessons");

  if (CERTIFICATE_ID_TO_CONFIG.has(certificateId)) {
    throw new Error("duplicate_certificate_id");
  }

  if (TYPE_ID_SET.has(typeId)) {
    throw new Error("duplicate_certificate_type_id");
  }

  TYPE_ID_SET.add(typeId);

  const config = {
    certificateId,
    typeId,
    trackId,
    priceWei,
    requiredLessonIds
  };

  CERTIFICATE_ID_TO_CONFIG.set(certificateId, config);
  TYPE_ID_TO_CONFIG.set(typeId, config);
  CERTIFICATE_CONFIGS.push(config);
}

function getCertificateConfig(certificateId) {
  return CERTIFICATE_ID_TO_CONFIG.get(certificateId) || null;
}

function getCertificateTypeId(certificateId) {
  return getCertificateConfig(certificateId)?.typeId || null;
}

function getCertificateConfigByTypeId(typeId) {
  const numericTypeId = Number(typeId);
  if (!Number.isInteger(numericTypeId) || numericTypeId <= 0) {
    return null;
  }

  return TYPE_ID_TO_CONFIG.get(numericTypeId) || null;
}

function getCertificateIdByTypeId(typeId) {
  return getCertificateConfigByTypeId(typeId)?.certificateId || null;
}

function getCertificatePriceWei(certificateId) {
  return getCertificateConfig(certificateId)?.priceWei || null;
}

function isSupportedCertificateId(certificateId) {
  return CERTIFICATE_ID_TO_CONFIG.has(certificateId);
}

function listCertificateConfigs() {
  return CERTIFICATE_CONFIGS.map((config) => ({
    ...config,
    requiredLessonIds: [...config.requiredLessonIds]
  }));
}

function isSupportedLessonId(lessonId) {
  if (typeof lessonId !== "string") {
    return false;
  }

  return LESSON_ID_SET.has(lessonId.trim().toUpperCase());
}

function isProfileEligibleForCertificate(profile, certificateId) {
  const config = getCertificateConfig(certificateId);
  if (!config || !profile || typeof profile !== "object") {
    return false;
  }

  const lessons = profile.lessons && typeof profile.lessons === "object" ? profile.lessons : {};

  return config.requiredLessonIds.every((lessonId) => Boolean(lessons[lessonId]?.passed));
}

module.exports = {
  getCertificateConfig,
  getCertificateTypeId,
  getCertificateConfigByTypeId,
  getCertificateIdByTypeId,
  getCertificatePriceWei,
  isSupportedCertificateId,
  listCertificateConfigs,
  isSupportedLessonId,
  isProfileEligibleForCertificate
};
