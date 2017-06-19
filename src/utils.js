// @flow
import {Readable} from 'stream';
import type { IncomingMessage } from 'http';

export const jsonToReadable = (json: Object): Readable => {
  const s = new Readable();
  s.push(JSON.stringify(json));
  s.push(null);
  return s;
};

export const getCurrentTimeInSeconds = () => Math.floor(Date.now() / 1000);