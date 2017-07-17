# Server Node reference

This is a server side Node.js library for [Feeds](https://pusher.com/feeds) service.
See the full documentation [here](http://docs.pusher.com/feeds/)

Please note that the reference is annotated with a statically typed dialect like
[Flow](https://flow.org/)

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

## Instantiate the Feeds object

Constructor `Feeds` takes a single options object with the following properties:

* `instance`:<i>string</i> [required] your instance ID; get this from [your
dashboard](https://dash.pusher.com)

* `key`:<i>string</i> [required] your key; get this from [your
  dashboard](https://dash.pusher.com)

### Example

```js
const feeds = new PusherFeeds({instance: your_instance_id, key: your_key});
```

## Publish single item to a feed

Publish an item to a feed, and broadcast the item to all subscribers.

### Definition

```js
feeds.publish(feedId: string, item: any): Promise<any>
```

#### Arguments

* `feedId`: The feed ID to publish to. If you publish to a feed that does not
  exist, it is lazily created.
* `item`: Arbitrary JSON representing the item data.

#### Returns

Promise with Node.js http.request `IncomingMessage`.

### Example

```js
feeds
  .publish(feed_id, {message: 'Hello World!'})
  .then(() => console.log('Succesfully published!'))
  .catch((err) => console.log(err));
```

## Publish multiple items to a feed

### Definition

```js
feeds.publishBatch(feedId: string, items: Array<any>): Promise<any>
```

#### Arguments

* `feedId`: The feed ID to publish to. If you publish to a feed that does not
  exist, it is lazily created.
* `items`: An array of the data of each item. Items are published into the feed
  in order from the start of the array.

#### Returns

Promise with Node.js http.request `IncomingMessage`.

### Example

```js
feeds
  .publishBatch(feed_id, [{message: 'Hello A!'}, {message: 'Hello B!'}])
  .then(() => console.log('Succesfully published!'))
  .catch((err) => console.log(err));
```

## Delete all items in a feed

### Definition

```js
feeds.delete(feedId: string): Promise<any>
```

#### Arguments

* `feedId`: The feed ID to delete items in.

#### Returns

Promise with Node.js http.request `IncomingMessage`.

### Example

```js
feeds.delete('newsfeed')
  .then(() => console.log('Succesfully deleted!'))
  .catch((err) => console.log(err));
```

## Authorize clients to access private feeds

This method allows you to authorize your clients for access to a certain feed.
Please see auth process
[diagram](http://docs.pusher.com/feeds/private-feeds/#reading-private-feeds-on-the-client)
and [example](https://github.com/pusher/feeds-auth-example-app) how to implement
this method with collaboration with one of our client side libraries.

### Definition

```js
feeds.authorizeFeed(
  payload: AuthorizePayload,
  hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool
): Promise<Object>
```

#### Arguments

* `payload` param is essentially POST request payload (or body) object of type
  `AuthorizePayload` (You can use
  [body-parser](https://github.com/expressjs/body-parser) to parse the POST
  request body for you). The object must have the following format: (Please note
  that if you using one of our client libraries they will handle this format for
  you)

```js
type AuthorizePayload = {
  path: string;
  action: string;
  grant_type: string;
};
```

* `hasPermissionCallback` parameter allows you to grant or deny permission to
  access a feed based on any information you have in scope (e.g. session data).
  It should either return a `bool`, or a `promise` of one. See the
  [auth-docs](https://pusher.com/docs/authenticating_users#authentication_process)
  for more details.

#### Returns

A `Promise` with an `authResponse` object with the properties listed below which
can then be used for client authorization.

```js
{
  access_token: token,
  token_type: token_type,
  expires_in: token_expiry,
  refresh_token: refresh_token
}
```

### Example

Using `Express.js` and `body-parser`:

```js
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

considering that we have the `Express.js` http server running on `http://localhost:5000` then we can test the auth endpoint with `curl`:
```sh
curl -X POST \
-d "action"="READ" \
-d "path"="feeds/private-my-feed-name/items" \
-d "grant_type"="client_credentials" \
http://localhost:5000/feeds/tokens
```

## Error handling

Since all the public methods on `Feeds` class returns `Promise` you should
always call `.catch()` on it to handle `Error` properly. `pusher-feeds-server`
library is using some custom Errors which extends standart JS `Error` object.
You can import them to your project if would like to use them.

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

