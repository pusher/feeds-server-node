$ git clone https://github.com/pusher/feeds-server-node
$ yarn
$ node examples/auth.js
$ curl 'http://localhost:5000/feeds/tokens?feed_id=private-callum&type=READ'

200 OK:
{
  "token": "...jwt..."
}

or

403 Forbidden
