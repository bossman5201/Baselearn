const { sendJson, methodNotAllowed } = require("./_lib/http");
const { listCertificateConfigs } = require("./_lib/certificate-config");
const { getContractStatus } = require("./_lib/certificate-chain");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  try {
    const status = await getContractStatus();

    return sendJson(res, 200, {
      ok: true,
      contract: status,
      certificates: listCertificateConfigs().map((item) => ({
        certificateId: item.certificateId,
        typeId: item.typeId,
        priceWei: item.priceWei,
        trackId: item.trackId
      }))
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: "contract_status_failed",
      details: error.message
    });
  }
};
