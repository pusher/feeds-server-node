# feeds-server-node

The Node.js server SDK for Pusher Feeds.

## Installation

[yarn](https://yarnpkg.com/):

```sh
$ yarn add pusher-feeds-server
```

[npm](https://www.npmjs.com/):

```sh
$ npm install pusher-feeds-server --save
```

## Quick start

### Importing

#### ES6
```js
// The default export is a Feeds class.
import PusherFeeds from 'pusher-feeds-server';
```

#### ES5 (CommonJS)
```js
// The default export is a Feeds class.
var PusherFeeds = require('pusher-feeds-server').Feeds;
```

### Using Library
```js
// Create instance of Feeds class
const pusherFeeds = new PusherFeeds({serviceId: your_service_id, serviceKey: your_service_key});

// Publish item to feed
pusherFeeds
  .publish(feed_id, {message: 'Hello World!'})
  .then(() => console.log('Succes!'))
  .catch((err) => console.log(err));

// Publish multiple items to feed
pusherFeeds
  .publishBatch(feed_id, [{message: 'Hello A!'}, {message: 'Hello B!'}])
  .then(() => console.log('Succes!'))
  .catch((err) => console.log(err));

// .... Init express js server
// Register auth endpoint
app.post('/feeds/tokens', (req, res) => {
  // Define hasPermission to be used in authorizedFeed function
  const hasPermission = (action, feedId) => (
    db.find(req.session.userId)
      .then(userId => userId === 'abcd')
  );

  // Authorized user with request payload and hasPermission callback.
  feeds.authorizeFeed(req, hasPermission)
    .then(data => res.send(data))
    .catch(err => {
      res.status(400).send(`${err.name}: ${err.message}`)
    });
});
```

## Reference

Please note that reference is annotated with statically typed dialect like [Flow](https://flow.org/)

### `Feeds` class

Takes a single options object with the following properties.

- `serviceId`:<i>string</i> [required] your service ID; get this from [your
  dashboard](https://dash.pusher.com)

- `serviceKey`:<i>string</i> [required] your service KEY; get this from [your
  dashboard](https://dash.pusher.com)

- `cluster`:<i>string</i> [optional] the host that your service lives on, defaults to
  `api-ceres.kube.pusherplatform.io`

### `pusherFeeds.publish(feedId: string, item: any): Promise<any>`

Publish single item into feed.

### `pusherFeeds.publishBatch(feedId: string, items: Array<any>): Promise<any>`

Publish multiple items into feed.

### `delete(feedId: string): Promise<any>;`

Delete all items in selected feed.

### `authorizeFeed(req: http.IncomingMessage, hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<any>;`

This method allows you to authenticate/authorize your clients for certain feed. Please see auth process [diagram](https://pusher.com/docs/authenticating_users#authentication_process) and [example](https://github.com/pusher/feeds-auth-example-app) how to implement this method with collaboration with one of our client side libraries.

- `req` param which is object of type `http.IncomingMessage`  with `body` property containing POST request payload (You can use [body-parser](https://github.com/expressjs/body-parser) to parse POST request body for you). The body must have format listed below:

```js
  {
    path: your_path,
    action: your_action_type,
    grant_type: your_grant_type
  }
```

- `hasPermissionCallback` paramater allows you to handle scenarious like you custom session handling. This callback is always called during auth process to detect wheter or not the token can be generated. You can use just `syncronous` callback or `asyncronous` by returning Promise from it.

Returns a Promise with `authResponse` object with properties listed below which then can be use for client authentication/authorization.

```js
{
  access_token: token,
  token_type: token_type,
  expires_in: token_expiry,
  refresh_token: refresh_token
}
```
# Development/Contribution
<strong>src/</strong> - library code</br>
<strong>examples/</strong> - demonstration app. Also useful for testing during development</br>
<strong>scripts/</strong> - scripts for tagging, building, test, releasing package
