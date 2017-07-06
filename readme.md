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
import Feeds from 'pusher-feeds-server';
```

#### ES5 (CommonJS)
```js
// The default export is a Feeds class.
var Feeds = require('pusher-feeds-server');
```

### Using Library
```js
// Create instance of Feeds class
const feeds = new PusherFeeds({serviceId: your_service_id, serviceKey: your_service_key});

// Publish item to feed
feeds
  .publish(feed_id, {message: 'Hello World!'})
  .then(() => console.log('Succes!'))
  .catch((err) => console.log(err));

// Publish multiple items to feed
feeds
  .publishBatch(feed_id, [{message: 'Hello A!'}, {message: 'Hello B!'}])
  .then(() => console.log('Succes!'))
  .catch((err) => console.log(err));

// .... Init express js server
// Register auth endpoint
app.post('/feeds/tokens', (req, res) => {
  // Define hasPermission to be used in authorizeFeed function
  const hasPermission = (action, feedId) => (
    db.find(req.session.userId)
      .then(userId => userId === 'abcd')
  );

  // Authorize user with request payload and hasPermission callback.
  feeds.authorizeFeed(req, hasPermission)
    .then(data => res.send(data))
    .catch(err => {
      res.status(400).send(`${err.name}: ${err.message}`)
    });
});
```

considering that we have the `Express` http server running on `http://localhost:5000` then we can test the auth endpoint with `curl`:
```sh
curl -X POST \
-d "action"="READ" \
-d "path"="feeds/private-my-feed-name/items" \
-d "grant_type"="client_credentials" \
http://localhost:5000/feeds/tokens
```

## Reference

Please note that the reference is annotated with a statically typed dialect like [Flow](https://flow.org/)

### `Feeds` class

Takes a single options object with the following properties.

- `serviceId`:<i>string</i> [required] your service ID; get this from [your
  dashboard](https://dash.pusher.com)

- `serviceKey`:<i>string</i> [required] your service key; get this from [your
  dashboard](https://dash.pusher.com)

- `cluster`:<i>string</i> [optional] the host that your service lives on, defaults to
  `api-ceres.pusherplatform.io`

### `feeds.publish(feedId: string, item: any): Promise<any>`

Publish single item into feed.

### `feeds.publishBatch(feedId: string, items: Array<any>): Promise<any>`

Publish multiple items into feed.

### `feeds.delete(feedId: string): Promise<any>;`

Delete all items in selected feed.

### `feeds.authorizeFeed(payload: AuthorizePayload, hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<Object>;`

This method allows you to authorize your clients for access to a certain feed. Please see auth process [diagram](https://pusher.com/docs/authenticating_users#authentication_process) and [example](https://github.com/pusher/feeds-auth-example-app) how to implement this method with collaboration with one of our client side libraries.

- `payload` param is essentially POST request payload (or body) object of type `AuthorizePayload` (You can use [body-parser](https://github.com/expressjs/body-parser) to parse the POST request body for you). The object must have the following format: (Please note that if you using one of our client libraries they will handle this format for you)

```js
type AuthorizePayload = {
  path: string;
  action: string;
  grant_type: string;
};
```

- `hasPermissionCallback` parameter allows you to grant or deny permission to access a feed based on any information you have in scope (e.g. session data). It should either return a `bool`, or a `promise` of one. See the [auth-docs](https://pusher.com/docs/authenticating_users#authentication_process) for more details.

Returns a `Promise` with an `authResponse` object with the properties listed below which can then be used for client authorization.

```js
{
  access_token: token,
  token_type: token_type,
  expires_in: token_expiry,
  refresh_token: refresh_token
}
```

### `Error` handling

Since all the public methods on `Feeds` class returns `Promise` you should always call `.catch()` on it to handle `Error` properly. `pusher-feeds-server` library is using some custom Errors which extends standart JS `Error` object. You can import them to your project if would like to use them.

### Importing

#### ES6
```js
import Feeds, {
    UnsupportedGrantTypeError,
    InvalidGrantTypeError,
    ClientError
  } from 'pusher-feeds-server';
```

#### ES5 (CommonJS)
```js
var Feeds = require('pusher-feeds-server');
var UnsupportedGrantTypeError = Feeds.UnsupportedGrantTypeError;
var InvalidGrantTypeError = Feeds.InvalidGrantTypeError;
var ClientError = Feeds.ClientError;
```

# Development/Contribution
<strong>src/</strong> - library code</br>
<strong>examples/</strong> - demonstration app. Also useful for testing during development</br>
<strong>scripts/</strong> - scripts for tagging, building, test, releasing package
