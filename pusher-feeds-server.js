const pusher = require("pusher-platform");
const url = require("url");
const Readable = require('stream').Readable;

const defaultHost = "api-ceres.kube.pusherplatform.io";
const feedIdRegex = /^[a-zA-Z0-9-]+$/;
// Permission types that clients may request; currently just "READ"
const clientPermissionTypes = ["READ"];

function send(res, status, contentType, data) {
  res.statusCode = status;
  res.setHeader("content-type", contentType);
  res.end(data);
}

function jsonToReadable(json) {
  const s = new Readable();
  s.push(JSON.stringify(json));
  s.push(null);
  return s;
}

function feedsClaims(feedId, type) {
  return {
    serviceClaims: {
      feeds: {
        permission: {
          feed_id: feedId,
          type: type
        }
      }
    }
  }
}

class PusherFeeds {
  constructor({ appId, appKey, host }) {
    this.basePath = "services/feeds/v1/feeds";

    this.pusherApp = new pusher.App({
      cluster: host || defaultHost,
      appId: appId,
      appKey: appKey,
    });
  }

  get token() {
    if (this._token && this._refresh < Math.floor(Date.now() / 1000)) {
      return this._token;
    }
    const { token, refresh } = this.pusherApp.generateAccessToken(
      feedsClaims("*", "*")
    );
    this._token = token;
    this._refresh = refresh;
    return this._token;
  }

  publish(feedId, items) {
    return this.pusherApp.request({
      method: "POST",
      path: `${this.basePath}/${feedId}/items`,
      jwt: this.token,
      headers: {
        "Content-Type": "application/json"
      },
      body: jsonToReadable({ items }),
    })
  }

  list(limit="", prefix="") {
    return this.pusherApp.request({
      method: "GET",
      path: `${this.basePath}?limit=${limit}&prefix=${prefix}`,
      jwt: this.token,
      headers: {
        "Content-Type": "application/json"
      },
    });
  }

  authorize(req, res, { userId }, hasPermission) {
    const feedId = req.body.feed_id;
    const type = req.body.type;
    if (!feedId || !type) {
      send(res, 400, "text/plain",
        "Must provide feed_id and type in the request body"
      );
    } else if (!feedId.match(feedIdRegex)) {
      send(res, 400, "text/plain", `feed_id must match regex ${feedIdRegex}`);
    } else if (!clientPermissionTypes.includes(type)) {
      send(res, 400, "text/plain",
        `type must be one of ${JSON.stringify(clientPermissionTypes)}`
      );
    } else if (hasPermission(feedId, type)) {
      this.pusherApp.authenticate(req, res, feedsClaims(feedId, type));
    } else {
      send(res, 403, "text/plain", "Forbidden");
    }
  }
}

module.exports = PusherFeeds;
