process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const http = require("http");
const Feeds = require("../pusher-feeds-server");

const hostname = "localhost";
const port = 5000;

const feeds = new Feeds({
  appId: "test",
  appKey: "the-id-bit:the-secret-bit"
});

// Does the user with the given ID have permission to perform operations of the
// given type on the feed with the given ID?
//
// For the sake of example we work with the schema whereby the "admin" user has
// READ access to all feeds, but everyone else has access only to the feed that
// corresponds to their own ID.
function hasPermission(userId, feedId, type) {
  if (type != "READ") {
    return false
  }
  if (userId === "admin") {
    return true
  }
  return feedId === `private-${userId}`;
}

const server = http.createServer((req, res) => {
  // TODO write an example in express to reduce boilerplate
  if (req.method != "GET" || req.url.split("?")[0] != "/feeds/tokens") {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain");
    res.end("Not found");
    return;
  }
  // Obviously we want this form an actual session, but just pretent for now
  const session = { userId: "callum" };
  // We don't require users to grant access based on userId, so the callback
  // only takes feedId and type.
  feeds.authorize(req, res, { userId: session.userId }, (feedId, type) => {
    return hasPermission(session.userId, feedId, type);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/\n`);
});

// Example requests:
// 
// $ curl 'http://localhost:5000/feeds/tokens?feed_id=private-callum&type=READ'
//
//   200 OK
//   {"token":"...jwt..."}
//
// $ curl 'http://localhost:5000/feeds/tokens?feed_id=private-will&type=READ'
//
//   403 Forbidden
//   Forbidden
//
// $ curl 'http://localhost:5000/feeds/tokens?feed_id=private-callum'
//
//   400 Bad Request
//   Bad Request
