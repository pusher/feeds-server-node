const jwt = require("jsonwebtoken");

const tokenLeeway = 30;
const tokenExpiry = 24 * 60 * 60;

function token({ appId, appKeyId, appKeySecret, feedId, type, userId }) {
  const now = Math.floor(Date.now() / 1000);
  const issuedAt = now - tokenLeeway;
  const expiresAt = issuedAt + tokenExpiry;
  const claims = {
    app: appId,
    iss: `keys/${appKeyId}`,
    iat: issuedAt,
    exp: expiresAt,
    sub: userId,
    feeds: {
      permission: {
        type,
        feed_id: feedId,
      }
    }
  };
  return {
    token: jwt.sign(claims, appKeySecret),
    refresh: expiresAt - 60 * 60
  };
}

module.exports = token;
