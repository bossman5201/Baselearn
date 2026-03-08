const { sendJson, methodNotAllowed } = require("./_lib/http");
const { isStorageReady } = require("./_lib/profile-store");
const { getContractAddress } = require("./_lib/certificate-chain");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  return sendJson(res, 200, {
    ok: true,
    storageReady: isStorageReady(),
    contractConfigured: Boolean(getContractAddress()),
    timestamp: new Date().toISOString()
  });
};
