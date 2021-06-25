// transpile:main

// BaseDriver exports
import * as driver from './lib/basedriver/driver.js';
import * as deviceSettings from './lib/basedriver/device-settings.js';

const { BaseDriver } = driver;
const { DeviceSettings, BASEDRIVER_HANDLED_SETTINGS } = deviceSettings;

export { BaseDriver, DeviceSettings, BASEDRIVER_HANDLED_SETTINGS };
export default BaseDriver;


// MJSONWP exports
import * as protocol from './lib/protocol/index.js';
import {
  DEFAULT_BASE_PATH, PROTOCOLS
} from './lib/constants.js';

const {
  Protocol, routeConfiguringFunction, errors, isErrorType,
  errorFromMJSONWPStatusCode, errorFromW3CJsonCode, ALL_COMMANDS, METHOD_MAP,
  routeToCommandName, NO_SESSION_ID_COMMANDS, isSessionCommand,
  normalizeBasePath, determineProtocol
} = protocol;

export {
  Protocol, routeConfiguringFunction, errors, isErrorType, PROTOCOLS,
  errorFromMJSONWPStatusCode, errorFromW3CJsonCode, determineProtocol,
  errorFromMJSONWPStatusCode as errorFromCode, ALL_COMMANDS, METHOD_MAP,
  routeToCommandName, NO_SESSION_ID_COMMANDS, isSessionCommand,
  DEFAULT_BASE_PATH, normalizeBasePath
};

// Express exports
import * as staticIndex from './lib/express/static.js';
const { STATIC_DIR } = staticIndex;
export { STATIC_DIR };

import * as serverIndex from './lib/express/server.js';
const { server } = serverIndex;
export { server };

// jsonwp-proxy exports
import * as proxyIndex from './lib/jsonwp-proxy/proxy.js';
const { JWProxy } = proxyIndex;
export { JWProxy };

// jsonwp-status exports
import * as statusIndex from './lib/jsonwp-status/status.js';
const { codes: statusCodes, getSummaryByCode } = statusIndex;
export { statusCodes, getSummaryByCode };

// W3C capabilities parser
import * as caps from './lib/basedriver/capabilities.js';
const { processCapabilities, isStandardCap, validateCaps } = caps;
export { processCapabilities, isStandardCap, validateCaps };

// Web socket helpers
import * as ws from './lib/express/websocket.js';
const { DEFAULT_WS_PATHNAME_PREFIX } = ws;
export { DEFAULT_WS_PATHNAME_PREFIX };
