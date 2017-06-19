$ git clone https://github.com/pusher/feeds-server-node
$ yarn (npm install)
$ yarn example (npm run example)
$ curl 'http://localhost:5000/feeds/tokens?feed_id=private-callum&type=READ,WRITE'

#### Development/Contribution
src/ - library code
examples/ - demonstration app. Also useful for testing during development
scripts/ - scripts for tagging, building, test, releasing package

Use https://github.com/evanw/node-source-map-support for source maps support

Authorize method responses:
200 OK:
{
  "token": "...jwt...",
  "refresh": unix_timestamp
}

or

403 Forbidden
