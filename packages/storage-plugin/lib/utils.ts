import _ from 'lodash';
import { errors } from 'appium/driver';


export function toW3cResponseError(err: any): [number, Record<string, any>] {
  const protocolError = _.has(err, 'w3cStatus') ? err : new errors.UnknownError(err);
  return [protocolError.w3cStatus, {
    value: {
      error: protocolError.error,
      message: protocolError.message,
      stacktrace: protocolError.stacktrace || protocolError.stack,
    },
  }];
}
