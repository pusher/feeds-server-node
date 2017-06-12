// @flow
import url from 'url';
import { Readable } from 'stream';
import type {IncomingMessage} from 'http';
import { App as PusherApp } from 'pusher-platform';

import { READ_PERMISSION, WRITE_PERMISSION, ALL_PERMISSION, clientPermissionTypes, getFeedsPermissionClaims } from './permissions';
import type { PermissionType } from './permissions';
import { jsonToReadable } from './utils';
import { ClientError } from './errors';

const defaultHost = 'api-ceres.kube.pusherplatform.io';
const feedIdRegex = /^[a-zA-Z0-9-]+$/;

type TokenWithRefresh = {
  token: string;
  refresh: number;
};

type Options = {
  host: string;
  serviceId: string;
  serviceKey: string;
};

type AuthRequestJSONBody = {
  feed_id?: string;
  type?: 'READ'|'WRITE';
};

export interface ServiceInterface {
  pusherApp: PusherApp;
  publish(feedId: string, items: any): Promise<any>;
  publishBatch(feedId: string, items: Array<any>): Promise<any>;
  authorize(req: IncomingMessage, hasPermission: (feedId: string, type: PermissionType) => bool): Promise<any>
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
  let tokenWithExpirationTime: TokenWithRefresh;

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
  
  /**
   * Excract body from incoming POST request to JSON
   * @private
   */
  const parseJsonBodyFromRequest = async (req: IncomingMessage): Promise<AuthRequestJSONBody> => (
    new Promise((resolve, reject) => {
      let jsonString = '';
      
      req.on('data', (data) => {
          jsonString += data;
      });

      req.on('end', () => {
          try {
            const json = JSON.parse(jsonString);
            resolve(json);
          } catch (err) {
            reject(err);
          }
      });
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
      return publish(feedId, items);
    }

    async authorize(
      req: IncomingMessage,
      hasPermission: (feedId: string, type: PermissionType) => bool
    ): Promise<any> {
      const requestBody = await parseJsonBodyFromRequest(req);
      const feedId = requestBody.feed_id;
      const type = requestBody.type;
      
      if (!feedId || !type) {
        throw new ClientError('Must provide feed_id and type in the request body', 400);
      }
      
      if (!feedId.match(feedIdRegex)) {
        throw new ClientError(`Feed_id must match regex ${feedIdRegex.toString()}`, 400);
      }
      
      if (!clientPermissionTypes.includes(type)) {
        throw new ClientError(`Type must be one of ${JSON.stringify(clientPermissionTypes)}`, 400);
      }
      
      if (!hasPermission(feedId, type)) {
        throw new ClientError('Forbidden', 403); 
      }

      return this.pusherApp.authenticate(req, getFeedsPermissionClaims(feedId, type));
    }
  }

  return new Service(pusherApp);
};