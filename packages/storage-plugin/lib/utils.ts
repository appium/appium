import _ from 'lodash';
import { errors, getResponseForW3CError } from 'appium/driver';


export function toW3cResponseError(err: any): [number, Record<string, any>] {
  if (_.isFunction(getResponseForW3CError)) {
    return getResponseForW3CError(err) as [number, Record<string, any>];
  }
  // TODO: deprecate the below after the plugin only supports Appium3+
  const protocolError = _.has(err, 'w3cStatus') ? err : new errors.UnknownError(err);
  return [protocolError.w3cStatus, {
    value: {
      error: protocolError.error,
      message: protocolError.message,
      stacktrace: protocolError.stacktrace || protocolError.stack,
    },
  }];
}
