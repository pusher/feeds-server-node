// @flow
import {Readable} from 'stream';

export const jsonToReadable = (json: Object): Readable => {
    const s = new Readable();
    s.push(JSON.stringify(json));
    s.push(null);
    return s;
};