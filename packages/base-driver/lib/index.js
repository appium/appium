// @ts-check

import B from 'bluebird';

B.config({
  cancellation: true,
});

// BaseDriver exports
import { BaseDriver } from './basedriver/driver';
export { DriverCore } from './basedriver/core';
import { DeviceSettings } from './basedriver/device-settings';

export { BaseDriver, DeviceSettings };
export default BaseDriver;


// MJSONWP exports
import * as protocol from './protocol';
import {
  DEFAULT_BASE_PATH, PROTOCOLS
} from './constants';

const {
  routeConfiguringFunction, errors, isErrorType,
  errorFromMJSONWPStatusCode, errorFromW3CJsonCode, ALL_COMMANDS, METHOD_MAP,
  routeToCommandName, NO_SESSION_ID_COMMANDS, isSessionCommand,
  determineProtocol, CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND, GET_STATUS_COMMAND,
} = protocol;

export {
  routeConfiguringFunction, errors, isErrorType, PROTOCOLS,
  errorFromMJSONWPStatusCode, errorFromW3CJsonCode, determineProtocol,
  errorFromMJSONWPStatusCode as errorFromCode, ALL_COMMANDS, METHOD_MAP,
  routeToCommandName, NO_SESSION_ID_COMMANDS, isSessionCommand,
  DEFAULT_BASE_PATH, CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND, GET_STATUS_COMMAND,
};

// Express exports
import * as staticIndex from './express/static';
const { STATIC_DIR } = staticIndex;
export { STATIC_DIR };

import * as serverIndex from './express/server';
const { server, normalizeBasePath } = serverIndex;
export { server, normalizeBasePath };

// jsonwp-proxy exports
import * as proxyIndex from './jsonwp-proxy/proxy';
const { JWProxy } = proxyIndex;
export { JWProxy };

// jsonwp-status exports
import * as statusIndex from './jsonwp-status/status';
const { codes: statusCodes, getSummaryByCode } = statusIndex;
export { statusCodes, getSummaryByCode };

// W3C capabilities parser
import * as caps from './basedriver/capabilities';
const { processCapabilities, isStandardCap, validateCaps } = caps;
export { processCapabilities, isStandardCap, validateCaps };

// Web socket helpers
import * as ws from './express/websocket';
const { DEFAULT_WS_PATHNAME_PREFIX } = ws;
export { DEFAULT_WS_PATHNAME_PREFIX };
