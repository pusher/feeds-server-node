// @flow
import url from 'url';
import { Readable } from 'stream';
import type { IncomingMessage } from 'http';
import { App as PusherApp } from 'pusher-platform';

import { READ_PERMISSION, ALL_PERMISSION, clientPermissionTypes, getFeedsPermissionClaims } from './permissions';
import type { ActionType } from './permissions';
import { jsonToReadable } from './utils';
import { ClientError } from './errors';

const defaultHost = 'api-ceres.kube.pusherplatform.io';
const pathRegex = /^feeds\/([a-zA-Z0-9-]+)\/items$/;

type TokenWithRefresh = {
  token: string;
  refresh: number;
};

export type Options = {
  host: string;
  serviceId: string;
  serviceKey: string;
};

export interface ServiceInterface {
  pusherApp: PusherApp;
  publish(feedId: string, items: any): Promise<any>;
  publishBatch(feedId: string, items: Array<any>): Promise<any>;
  authorizeFeed(req: IncomingMessage, hasPermission: (action: ActionType, path: string) => Promise<bool> | bool): Promise<any>,
  authorizePath(req: IncomingMessage, hasPermission: (action: ActionType, feedId: string) => Promise<bool> | bool): Promise<any>
};

type IncomingMessageWithBody = IncomingMessage & {
  body: any;
}

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
  let tokenWithExpirationTime: TokenWithRefresh = {};

  /**
   * This method manage token for http library and pusher platform communication
   * @private
   */
  const getServerToken = (): string => {
    {
      const {token, refresh} = tokenWithExpirationTime;
      // If token exists and is still valid just return it..
      if (token && refresh < Math.floor(Date.now() / 1000)) {
        return token;
      }
    }
    // Oterwise generate new token and it's expiration time
    const {token, refresh} = pusherApp.generateAccessToken(getFeedsPermissionClaims(ALL_PERMISSION, ALL_PERMISSION));

    tokenWithExpirationTime = {
      token,
      refresh
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

    async authorizeFeed(
      req: IncomingMessageWithBody,
      hasPermission: (action: ActionType, feedId: string) => Promise<bool> | bool
    ) {
      const body = req.body;
      const path: string = req.body.path;
      const action: ActionType = req.body.action;

      if (!path || !action) {
        throw new ClientError('Must provide "path" and "action" in the request body', 400);
      }
      
      if (!path.match(pathRegex)) {
        throw new ClientError(`Path must match regex ${pathRegex.toString()}`, 400);
      }
      
      if (!clientPermissionTypes.includes(action)) {
        throw new ClientError(`Type must be one of ${JSON.stringify(clientPermissionTypes)}`, 400);
      }
      
      const feedId = path.match(pathRegex)[1];

      if (!hasPermission(action, feedId)) {
        throw new ClientError('Forbidden', 403); 
      }

      try {
        const data = this.pusherApp.authenticate(req, getFeedsPermissionClaims(action, path));
        return data;
      } catch (err) {
        throw err;
      }
    }

    async authorizePath(
      req: IncomingMessageWithBody,
      hasPermission: (action: ActionType, path: string) => Promise<bool> | bool
    ): Promise<any> {
      const body = req.body;
      const path: string = req.body.path;
      const action: ActionType = req.body.action;

      if (!path || !action) {
        throw new ClientError('Must provide "path" and "action" in the request body', 400);
      }
      
      if (!path.match(pathRegex)) {
        throw new ClientError(`Path must match regex ${pathRegex.toString()}`, 400);
      }
      
      if (!clientPermissionTypes.includes(action)) {
        throw new ClientError(`Type must be one of ${JSON.stringify(clientPermissionTypes)}`, 400);
      }
      
      if (!hasPermission(action, path)) {
        throw new ClientError('Forbidden', 403); 
      }

      try {
        const data = this.pusherApp.authenticate(req, getFeedsPermissionClaims(action, path));
        return data;
      } catch (err) {
        throw err;
      }
    }
  }

  return new Service(pusherApp);
};