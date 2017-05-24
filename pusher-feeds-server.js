const request = require("request-promise-native");
const url = require("url");
const tokens = require("./pusher-feeds-tokens")

const defaultHost = "api-ceres.kube.pusherplatform.io";

function send(res, status, contentType, data) {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(data);
}

class PusherFeeds {
  constructor({ appId, appKey, host }) {
    host = host || defaultHost;
    this.appID = appId;
    this.urlBase = `https://${host}/apps/${this.appID}/services/feeds/v1`;

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
        Authorization: `JWT ${this.serverToken}`
      },
      body: { items },
      json: true
    });
  }

  list(limit="", prefix="") {
    return request({
      url: `${this.urlBase}/feeds?limit=${limit}&prefix=${prefix}`,
      headers: {
        Authorization: `JWT ${this.serverToken}`
      },
      json: true
    });
  }

  authenticate(req, res, hasPermission, userId) {
    const { feed_id: feedId, type } = url.parse(req.url, true).query;
    if (!feedId || !type) {
      send(res, 400, "text/plain", "Bad Request");
      return;
    }
    if (!hasPermission(feedId, type)) {
      send(res, 403, "text/plain", "Forbidden");
      return;
    }
    send(res, 200, "application/json", JSON.stringify({
      token: tokens.client(Object.assign({}, this, { feedId, type, userId }))
    }));
  }
}

module.exports = PusherFeeds;
