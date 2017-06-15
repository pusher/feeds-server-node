// @flow

export class ClientError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);

    this.name = 'ClientError';
    this.statusCode = statusCode;
  }
}