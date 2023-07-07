import B from 'bluebird';

B.config({
  cancellation: true,
});

// BaseDriver exports
import {BaseDriver} from './basedriver/driver';
export {DriverCore} from './basedriver/core';
export {DeviceSettings} from './basedriver/device-settings';

export {BaseDriver};
export default BaseDriver;

// MJSONWP exports
export * from './protocol';
export {errorFromMJSONWPStatusCode as errorFromCode} from './protocol';
export {DEFAULT_BASE_PATH, PROTOCOLS, W3C_ELEMENT_KEY} from './constants';

// Express exports
export {STATIC_DIR} from './express/static';
export {
  server,
  normalizeBasePath,
  type ServerOpts,
  type RouteConfiguringFunction,
  type RouteConfiguringFunctionOpts,
} from './express/server';

// jsonwp-proxy exports
export {JWProxy} from './jsonwp-proxy/proxy';
export type {ProtocolConverter} from './jsonwp-proxy/protocol-converter';

// jsonwp-status exports
export {getSummaryByCode, codes as statusCodes} from './jsonwp-status/status';

// W3C capabilities parser
export {
  PREFIXED_APPIUM_OPTS_CAP,
  STANDARD_CAPS,
  processCapabilities,
  isStandardCap,
  validateCaps,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
  type ValidateCapsOpts,
} from './basedriver/capabilities';

// Web socket helpers
export {DEFAULT_WS_PATHNAME_PREFIX} from './express/websocket';
