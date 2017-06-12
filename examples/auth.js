import { readFile } from 'fs';
import {join as joinPath} from 'path';

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';

import Service from '../src/index';

const feeds = new Service({
  serviceId: 'auth-example-app',
  serviceKey: 'the-id-bit:the-secret-bit',
  host: 'api-staging-ceres.kube.pusherplatform.io'
});

function hasPermission(userId, feedId) {
  return userId === 'big-brother' || feedId === `private-${userId}`;
}

const app = express();

app.use(express.static(joinPath(process.cwd(), 'static')));
app.use(session({ secret: 'HvCYzkbSjv3hNUf3fetPChO7DNxNPuOB' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Auth user and redirect to main page
app.get('/login', (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

// Render template with public and private feeds for logged user
app.get('/notes/:note_id', (req, res) => {
  // Hacky templating to embed the user ID
  readFile(joinPath(process.cwd(), 'notes-template.html'), 'utf8', (err, data) => {
    res.type('html');
    res.send(
      data
        .replace(/\$NOTE_ID/g, req.params.note_id)
        .replace(/\$USER_ID/g, req.session.userId)
    );
  });
});

// Publish data into private feed
app.post('/notes/:user_id', (req, res) => {
  const feedId = `private-${req.params.user_id}`

  if (!hasPermission(req.session.userId, feedId)) {
    return res.sendStatus(401);
  }

  feeds
    .publish(feedId, [ req.body ])
    .then(() => res.sendStatus(204))
    .catch(err => res.status(400).send(err));
});

// Publis data into public feed
// Does not require any authe
app.post('/newsfeed', (req, res) => {
  feeds
    .publish('newsfeed', [ req.body ])
    .then(data => res.sendStatus(204))
    .catch(err => res.status(400).send(err));
});

app.post('/feeds/tokens', (req, res) => {
  const validateRequest = (feedId, type) => type === 'READ' && hasPermission(req.session.userId, feedId); 
  feeds.authorize(req, res, {}, '');
});

const port = process.env.PORT || 5000;
app.listen(port);
console.log(`Listening on port ${port}`);