const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const Feeds = require("../pusher-feeds-server");

const feeds = new Feeds({
  appId: "auth-example-app",
  appKey: "the-id-bit:the-secret-bit",
  host: "api-staging-ceres.kube.pusherplatform.io"
});

function hasPermission(userId, feedId) {
  return userId === "big-brother" || feedId === `private-${userId}`;
}

const app = express();
app.use(express.static("static"));
app.use(session({ secret: "HvCYzkbSjv3hNUf3fetPChO7DNxNPuOB" }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))


app.get("/login", (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

app.post("/notes/:user_id", (req, res) => {
  const feedId = `private-${req.params.user_id}`
  if (hasPermission(req.session.userId, feedId)) {
    feeds.publish(feedId, [ req.body ]);
    res.sendStatus(204);
  } else {
    res.sendStatus(401);
  }
});

app.post("/feeds/tokens", (req, res) => {
  feeds.authorize(req, res, {}, (feedId, type) => {
    return type === "READ" && hasPermission("will", feedId);
  });
});

const port = process.env.PORT || 5000;
app.listen(port);
console.log(`Listening on port ${port}`);
