import Feeds from './feeds';
import { ClientError } from './errors';
import {UnsupportedGrantTypeError, InvalidGrantTypeError} from 'pusher-platform-node';

module.exports = Feeds;
module.exports.UnsupportedGrantTypeError = UnsupportedGrantTypeError;
module.exports.InvalidGrantTypeError = InvalidGrantTypeError;
module.exports.ClientError = ClientError;
