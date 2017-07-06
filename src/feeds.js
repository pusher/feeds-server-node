// @flow
import url from 'url';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { App as PusherService, TOKEN_LEEWAY } from 'pusher-platform-node';

import { READ_PERMISSION, ALL_PERMISSION, clientPermissionTypes, getFeedsPermissionClaims } from './permissions';
import type { ActionType } from './permissions';
import { jsonToReadable, getCurrentTimeInSeconds } from './utils';
import { ClientError } from './errors';

import { defaultCluster, pathRegex } from './constants';

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
  instance: string;
  host: string;
};

interface FeedsInterface {
  pusherService: PusherService;
  publish(feedId: string, item: any): Promise<any>;
  publishBatch(feedId: string, items: Array<any>): Promise<any>;
  delete(feedId: string): Promise<any>;
  authorizeFeed(payload: AuthorizePayload, hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<any>;
  authorizePath(payload: AuthorizePayload, hasPermissionCallback: (action: ActionType, path: string) => Promise<bool> | bool): Promise<any>;
};

export default ({instance, host}: Options = {}) => {
  const basePath = 'services/feeds/v1/feeds';
  const pusherService = new PusherService({ instance, host });

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
    const {token, expires_in} = pusherService.generateAccessToken(getFeedsPermissionClaims(ALL_PERMISSION, ALL_PERMISSION));
    
    tokenWithExpirationTime = {
      token,
      expiresIn: getCurrentTimeInSeconds() + expires_in - TOKEN_LEEWAY
    };

    return token;
  };

  /**
   * @private
   */
  const publish = (feedId: string, items: Array<any>): Promise<any> => (
    pusherService.request({
      method: 'POST',
      path: `${basePath}/${feedId}/items`,
      jwt: getServerToken(),
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonToReadable({ items }),
    })
  );

  /**
   * @private
   */
  const deleteItems = (feedId): Promise<any> => (
    pusherService.request({
      method: 'DELETE',
      path: `${basePath}/${feedId}/items`,
      jwt: getServerToken()
    })
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
    
    return pusherService.authenticate({ body: payload }, getFeedsPermissionClaims(action, path));
  };

  class Feeds implements FeedsInterface {
    pusherService: typeof PusherService;

    constructor(pusherApp: typeof pusherService) {
      this.pusherService = pusherApp;
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

  return new Feeds(pusherService);
};
