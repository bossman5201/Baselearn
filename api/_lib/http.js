function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length > 0) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
}

function methodNotAllowed(res, allow) {
  res.setHeader("Allow", allow.join(", "));
  return sendJson(res, 405, {
    ok: false,
    error: "method_not_allowed",
    allow
  });
}

function validateRequiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${fieldName} is required`;
  }

  return null;
}

module.exports = {
  sendJson,
  readJsonBody,
  methodNotAllowed,
  validateRequiredString
};
