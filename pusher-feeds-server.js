const request = require("request-promise-native");
const url = require("url");
const tokens = require("./pusher-feeds-tokens")

const defaultHost = "api-ceres.kube.pusherplatform.io";
const feedIdRegex = /^[a-zA-Z0-9-]+$/;
// Permission types that clients may request; currently just "READ"
const clientPermissionTypes = ["READ"];

function send(res, status, contentType, data) {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(data);
}

class PusherFeeds {
  constructor({ appId, appKey, host }) {
    host = host || defaultHost;
    this.appId = appId;
    this.urlBase = `https://${host}/apps/${this.appId}/services/feeds/v1`;

    const keyParts = appKey.split(":");
    if (keyParts.length != 2) {
      throw new Error("Invalid app key");
    }
    [ this.appKeyId, this.appKeySecret ] = keyParts;

    this.serverToken = tokens.server(this);
  }

  publish(feedId, items) {
    return request({
      method: "POST",
      url: `${this.urlBase}/feeds/${feedId}/items`,
      headers: {
        Authorization: `Bearer ${this.serverToken}`
      },
      body: { items },
      json: true
    });
  }

  list(limit="", prefix="") {
    return request({
      url: `${this.urlBase}/feeds?limit=${limit}&prefix=${prefix}`,
      headers: {
        Authorization: `Bearer ${this.serverToken}`
      },
      json: true
    });
  }

  authorize(req, res, { userId }, hasPermission) {
    const { feed_id: feedId, type } = url.parse(req.url, true).query;
    if (!feedId || !type) {
      send(res, 400, "text/plain",
        "Must provide feed_id and type query parameter"
      );
    } else if (!feedId.match(feedIdRegex)) {
      send(res, 400, "text/plain", `feed_id must match regex ${feedIdRegex}`);
    } else if (!clientPermissionTypes.includes(type)) {
      send(res, 400, "text/plain",
        `type must be one of ${JSON.stringify(clientPermissionTypes)}`
      );
    } else if (hasPermission(feedId, type)) {
      send(res, 200, "application/json", JSON.stringify({
        token: tokens.client(Object.assign({}, this, { feedId, type, userId }))
      }));
    } else {
      send(res, 403, "text/plain", "Forbidden");
    }
  }
}

module.exports = PusherFeeds;
