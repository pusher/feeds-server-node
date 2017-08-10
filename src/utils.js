// @flow
import {Readable} from 'stream';
import type { IncomingMessage } from 'http';

export const jsonToReadable = (json: Object): Readable => {
  const s = new Readable();
  s.push(JSON.stringify(json));
  s.push(null);
  return s;
};

export const getCurrentTimeInSeconds = (): number => Math.floor(Date.now() / 1000);

export const parseResponseBody = (promise: Promise<any>): Promise<any> => (
  new Promise((resolve, reject) => {
    promise.then(response => {
      try {
        resolve(JSON.parse(response.body));
      } catch (err) {
        reject(err);
      }
    }).catch(reject);
  })
);
