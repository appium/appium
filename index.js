// transpile:main

// BaseDriver exports
import * as driver from './lib/basedriver/driver';
import * as image from './lib/basedriver/image-element';
import * as deviceSettings from './lib/basedriver/device-settings';

const { BaseDriver } = driver;
const { ImageElement } = image;
const { DeviceSettings, BASEDRIVER_HANDLED_SETTINGS } = deviceSettings;

export { BaseDriver, DeviceSettings, ImageElement, BASEDRIVER_HANDLED_SETTINGS };
export default BaseDriver;


// MJSONWP exports
import * as protocol from './lib/protocol';
import {
  DEFAULT_BASE_PATH, PROTOCOLS
} from './lib/constants';

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
import * as staticIndex from './lib/express/static';
const { STATIC_DIR } = staticIndex;
export { STATIC_DIR };

import * as serverIndex from './lib/express/server';
const { server } = serverIndex;
export { server };

// jsonwp-proxy exports
import * as proxyIndex from './lib/jsonwp-proxy/proxy';
const { JWProxy } = proxyIndex;
export { JWProxy };

// jsonwp-status exports
import * as statusIndex from './lib/jsonwp-status/status';
const { codes: statusCodes, getSummaryByCode } = statusIndex;
export { statusCodes, getSummaryByCode };

// W3C capabilities parser
import * as caps from './lib/basedriver/capabilities';
const { processCapabilities, isStandardCap } = caps;
export { processCapabilities, isStandardCap };

// Web socket helpers
import * as ws from './lib/express/websocket';
const { DEFAULT_WS_PATHNAME_PREFIX } = ws;
export { DEFAULT_WS_PATHNAME_PREFIX };
