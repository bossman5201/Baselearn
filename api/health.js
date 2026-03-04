const { sendJson, methodNotAllowed } = require("./_lib/http");
const { isStorageReady } = require("./_lib/profile-store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  return sendJson(res, 200, {
    ok: true,
    storageReady: isStorageReady(),
    timestamp: new Date().toISOString()
  });
};
