// @flow
import url from 'url';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { Instance as PusherInstance, DEFAULT_TOKEN_LEEWAY } from 'pusher-platform-node';

import { READ_PERMISSION, ALL_PERMISSION, clientPermissionTypes, getFeedsPermissionClaims } from './permissions';
import type { ActionType } from './permissions';
import { getCurrentTimeInSeconds, parseResponseBody } from './utils';
import { ClientError } from './errors';

import { pathRegex } from './constants';

type TokenWithExpiry = {
  token: string;
  expiresIn: number;
};

type AuthorizePayload = {
  path: string;
  action: ActionType;
  grant_type: string;
};

type Options = {
  instanceLocator: string;
  key: string;
  host?: string;
};

type PaginateOptions = {
  cursor: ?number;
  limit: ?number;
};

type Item = {
  id: string;
  created: number;
  data: any;
};

type PaginateResponse = {
  items: [Item];
  next_cursor: ?string;
};

interface FeedsInterface {
  pusherInstance: PusherInstance;
  paginate(feedId: string, options: ?PaginateOptions): Promise<PaginateResponse>;
  publish(feedId: string, item: any): Promise<any>;
  publishBatch(feedId: string, items: Array<any>): Promise<any>;
  delete(feedId: string): Promise<any>;
  authorizeFeed(payload: AuthorizePayload, hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<any>;
  authorizePath(payload: AuthorizePayload, hasPermissionCallback: (action: ActionType, path: string) => Promise<bool> | bool): Promise<any>;
};

export default ({instanceLocator, key, host}: Options = {}) => {
  const pusherInstance = new PusherInstance({
    locator: instanceLocator,
    key,
    host,
    serviceVersion: 'v1',
    serviceName: 'feeds'
  });

  /**
   * Token and expiration time for communication between server-pusher platform
   * @private
   */
  let tokenWithExpirationTime: TokenWithExpiry = {
    token: '',
    expiresIn: 0
  };

  /**
   * This method manages the token for http library and pusher platform
   * communication
   * @private
   */
  const getServerToken = (): string => {
    {
      const {token, expiresIn} = tokenWithExpirationTime;
      // If token exists and is still valid just return it..
      if (token && expiresIn > getCurrentTimeInSeconds()) {
        return token;
      }
    }
    // Otherwise generate new token and its expiration time
    const {token, expires_in} = pusherInstance.generateAccessToken(getFeedsPermissionClaims(ALL_PERMISSION, ALL_PERMISSION));

    tokenWithExpirationTime = {
      token,
      expiresIn: getCurrentTimeInSeconds() + expires_in - DEFAULT_TOKEN_LEEWAY
    };

    return token;
  };

  /**
   * @private
   */
  const paginate = (feedId, options : ?PaginateOptions)
      : Promise<PaginateResponse> => {
    const { cursor, limit } = options || {};
    return parseResponseBody(
      pusherInstance.request({
        method: 'GET',
        path: `/feeds/${feedId}/items`,
        qs: {
          cursor,
          limit: limit || 50,
        },
        jwt: getServerToken(),
      })
    )
  };

  /**
   * @private
   */
  const publish = (feedId: string, items: Array<any>): Promise<any> => (
    parseResponseBody(
      pusherInstance.request({
        method: 'POST',
        path: `/feeds/${feedId}/items`,
        jwt: getServerToken(),
        headers: {
          'Content-Type': 'application/json'
        },
        body: { items },
      })
    )
  );

  /**
   * @private
   */
  const deleteItems = (feedId): Promise<any> => (
    pusherInstance.request({
      method: 'DELETE',
      path: `/feeds/${feedId}/items`,
      jwt: getServerToken()
    })
    .then(data => '')
  );

  const authorize = async (
    payload: AuthorizePayload,
    hasPermissionCallback: (action: ActionType, b: string) => Promise<bool> | bool,
    supplyFeedIdToCallback: bool = false
  ): Promise<any> => {
    if (typeof hasPermissionCallback !== 'function') {
      throw new Error('HasPermission must be a function');
    }

    if (!payload) {
      throw new ClientError('Payload must be provided');
    }

    const { action, path }: {action: ActionType; path: string; } = payload;

    if (!action || !path) {
      throw new ClientError('Must provide "action" and "path" in the request body');
    }

    if (clientPermissionTypes.indexOf(action)) {
      throw new ClientError(`Action must be one of ${JSON.stringify(clientPermissionTypes)}`);
    }

    const hasPermission = await hasPermissionCallback(action, path);

    if (!hasPermission) {
      throw new ClientError('Forbidden');
    }

    return pusherInstance.authenticate(payload, getFeedsPermissionClaims(action, path));
  };

  class Feeds implements FeedsInterface {
    pusherInstance: typeof PusherInstance;

    constructor(pusherApp: typeof pusherInstance) {
      this.pusherInstance = pusherApp;
    }

    paginate (feedId: string, options: ?PaginateOptions)
        : Promise<PaginateResponse> {
      return paginate(feedId, options);
    }

    publish (feedId: string, item: any): Promise<any> {
      return publish(feedId, [item]);
    }

    publishBatch (feedId: string, items: Array<any>): Promise<any> {
      return publish(feedId, items);
    }

    delete (feedId: string): Promise<any> {
      return deleteItems(feedId);
    }

    authorizeFeed(
      payload: AuthorizePayload,
      hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool
    ): Promise<Object> {
      if (typeof hasPermissionCallback !== 'function') {
        throw new Error('HasPermission must be a function');
      }

      const wrappedHasPermissionCallback = (action, path) => {
        const matchedPath = path.match(pathRegex);

        if (!matchedPath) {
          throw new ClientError(`Path must match regex ${pathRegex.toString()}`);
        }

        return hasPermissionCallback(action, matchedPath[1]);
      };

      return authorize(payload, wrappedHasPermissionCallback);
    }

    authorizePath(
      payload: AuthorizePayload,
      hasPermissionCallback: (action: ActionType, path: string) => Promise<bool> | bool
    ): Promise<Object> {
      return authorize(payload, hasPermissionCallback);
    }
  }

  return new Feeds(pusherInstance);
};
