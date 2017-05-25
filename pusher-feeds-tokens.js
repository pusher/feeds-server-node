const jwt = require("jsonwebtoken");

const tokenLeeway = 30;
const tokenExpiry = 24 * 60 * 60;

function server({ appId, appKeyId, appKeySecret }) {
  const claims = {
    app: appId,
    iss: appKeyId,
    feeds: {
      permission: {
        type: "*",
        feedId: "*"
      }
    }
  };
  return jwt.sign(claims, appKeySecret);
}

function client({ appId, appKeyId, appKeySecret, feedId, type, userId }) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    app: appId,
    iss: appKeyId,
    iat: now - tokenLeeway,
    exp: now - tokenLeeway + tokenExpiry,
    sub: userId,
    feeds: {
      permission: {
        type,
        feedId,
      }
    }
  };
  return jwt.sign(claims, appKeySecret);
}

module.exports = { server, client }
