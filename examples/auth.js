import { readFile } from 'fs';
import {join as joinPath} from 'path';

import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';

import Feeds from '../src/index';

const feeds = new Feeds({
  instanceId: '',
  key: '',
});

function hasPermission(userId, feedId) {
  return new Promise((resolve, reject) => {
    if (userId === 'big-brother' || feedId === `private-${userId}`) {
      return resolve(true);
    }
    reject(false);
  });
}

const app = express();

app.use(express.static(joinPath(process.cwd(), 'static')));
app.use(session({ secret: 'HvCYzkbSjv3hNUf3fetPChO7DNxNPuOB' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Auth user and redirect to main page
app.get('/', (req, res) => {
  readFile(joinPath(process.cwd(), 'index.html'), 'utf8', (err, data) => {
    res.type('html');
    res.send(data);
  });
});

app.get('/login', (req, res) => {
  req.session.userId = req.query.user_id;
  res.redirect(`/notes/${req.query.user_id}`);
});

// Render template with public and private feeds for logged user
app.get('/notes/:note_id', (req, res) => {
  if (!req.session.userId) {
    res.redirect('/');
    return;
  }

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
    .publish(feedId, req.body)
    .then((data) => {
      console.log(`Publish private:`, data);
      res.sendStatus(204)
    })
    .catch(err => res.status(400).send(err));
});

app.delete('/notes/:user_id', (req, res) => {
  const feedId = `private-${req.params.user_id}`

  if (!hasPermission(req.session.userId, feedId)) {
    return res.sendStatus(401);
  }

  feeds
    .delete(feedId)
    .then((data) => {
      res.sendStatus(204);
      console.log(`Delete private:`, data);
    })
    .catch(err => {
      res.status(400).send(err);
    });
});

// Publis data into public feed
// Does not require any auth
app.post('/newsfeed', (req, res) => {
  feeds
    .publish('newsfeed', req.body)
    .then(data => {
      console.log(`Publish public:`, data);
      res.sendStatus(204)
    })
    .catch(err => {
      res.status(400).send(err)
    });
});

app.post('/feeds/tokens', (req, res) => {
  // The callback passed to authorizeFeed can be synchronous or asynchronous.
  // The commented out example below is syncrhonous, whereas the function passed
  // in below is asynchronous.

  // const validateRequest = (action, feedId) => {
  //   console.log('sync callback');
  //   return action === 'READ'
  // };

  const validateRequest = (action, feedId) => (
    new Promise((resolve, reject) => {
      if (action === 'READ') {
        return resolve(true);
      }
      reject(new Error('The database is down, so I was not able to do a fake call!'));
    })
  );

  feeds.authorizeFeed(req.body, validateRequest)
    .then(data => res.send(data))
    .catch(err => {
      res.status(400).send(`Catched - ${err.name}: ${err.message}`)
    });
});

app.get('/newsfeed/paginate', (req, res) => {
  const { limit = 0 } = req.query;

  feeds
  .paginate('newsfeed', {limit})
  .then(data => {
    res.send(data);
  })
  .catch(err => console.log(err));
});

const port = process.env.PORT || 5000;
app.listen(port);
console.log(`Listening on port ${port}`);
