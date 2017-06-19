// @flow
import url from 'url';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { App as PusherApp } from 'pusher-platform';

import { READ_PERMISSION, ALL_PERMISSION, clientPermissionTypes, getFeedsPermissionClaims } from './permissions';
import type { ActionType } from './permissions';
import { jsonToReadable, getCurrentTimeInSeconds } from './utils';
import { ClientError } from './errors';

import { defaultHost, pathRegex, cacheExpiryTolerance } from './constants';

type TokenWithExpiry = {
  token: string;
  expiresIn: number;
};

// FIXME - just hack around using body-parser
// We should find better way how to extract data from request
type IncomingMessageWithBody = {
  body: any;
};

type Options = {
  host: string;
  serviceId: string;
  serviceKey: string;
};

interface ServiceInterface {
  pusherApp: PusherApp;
  publish(feedId: string, items: any): Promise<any>;
  publishBatch(feedId: string, items: Array<any>): Promise<any>;
  authorize(req: IncomingMessageWithBody, hasPermissionCallback: (action: ActionType, a: string) => Promise<bool> | bool): Promise<any>,
  authorizeFeed(req: IncomingMessageWithBody, hasPermissionCallback: (action: ActionType, path: string) => Promise<bool> | bool): Promise<any>,
  authorizePath(req: IncomingMessageWithBody, hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<any>
};

export default ({host, serviceId, serviceKey}: Options) => {
  const basePath = 'services/feeds/v1/feeds';
  const pusherApp = new PusherApp({
    cluster: host || defaultHost,
    appId: serviceId,
    appKey: serviceKey,
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
   * This method manage token for http library and pusher platform communication
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
    // Oterwise generate new token and it's expiration time
    const {token, expires_in} = pusherApp.generateAccessToken(getFeedsPermissionClaims(ALL_PERMISSION, ALL_PERMISSION));

    tokenWithExpirationTime = {
      token,
      expiresIn: getCurrentTimeInSeconds() + expires_in - cacheExpiryTolerance
    };

    return token;
  };

  /**
   * @private
   */
  const publish = (feedId: string, items: Array<any>): Promise<any> => (
    pusherApp.request({
      method: 'POST',
      path: `${basePath}/${feedId}/items`,
      jwt: getServerToken(),
      headers: {
        'Content-Type': 'application/json'
      },
      body: jsonToReadable({ items }),
    })
  );

  class Service implements ServiceInterface {
    pusherApp: typeof PusherApp;

    constructor(pusherApp: typeof PusherApp) {
      this.pusherApp = pusherApp;
    }

    publish (feedId: string, item: any): Promise<any> {
      return publish(feedId, [item]);
    }

    publishBatch (feedId: string, items: Array<any>): Promise<any> {
      return publish(feedId, [items]);
    }

    async authorize(
      req: IncomingMessageWithBody,
      hasPermissionCallback: (action: ActionType, b: string) => Promise<bool> | bool,
      supplyFeedIdToCallback: bool = false
    ): Promise<bool> {
      if (typeof hasPermissionCallback !== 'function') {
        throw new Error('HasPermission must be a function');
      }

      if (!req.body) {
        throw new ClientError('http.IncomingMessage must be provided with body of post request');
      }

      const { action, path }: {action: ActionType; path: string; } = req.body;

      if (!action || !path) {
        throw new ClientError('Must provide "action" and "path" in the request body');
      }
      
      if (!clientPermissionTypes.includes(action)) {
        throw new ClientError(`Action must be one of ${JSON.stringify(clientPermissionTypes)}`);
      }

      const matchedPath = path.match(pathRegex);

      if (!matchedPath) {
        throw new ClientError(`Path must match regex ${pathRegex.toString()}`);
      }

      const hasPermission = await hasPermissionCallback(action, (supplyFeedIdToCallback) ? matchedPath[1] : path);

      if (!hasPermission) {
        throw new ClientError('Forbidden');
      }

      return this.pusherApp.authenticate(req, getFeedsPermissionClaims(action, path));
    }

    authorizeFeed(
      req: IncomingMessageWithBody,
      hasPermissionCallback: (action: ActionType, feedId: string) => Promise<bool> | bool
    ): Promise<any> {
      return this.authorize(req, hasPermissionCallback, true);
    }

    authorizePath(
      req: IncomingMessageWithBody,
      hasPermissionCallback: (action: ActionType, path: string) => Promise<bool> | bool
    ): Promise<any> {
      return this.authorize(req, hasPermissionCallback);
    }
  }

  return new Service(pusherApp);
};