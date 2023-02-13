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
export {DEFAULT_BASE_PATH, PROTOCOLS} from './constants';

// Express exports
export {STATIC_DIR} from './express/static';
export {server, normalizeBasePath} from './express/server';

// jsonwp-proxy exports
export {JWProxy} from './jsonwp-proxy/proxy';

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
} from './basedriver/capabilities';

// Web socket helpers
export {DEFAULT_WS_PATHNAME_PREFIX} from './express/websocket';

/**
 * @typedef {import('./express/server').ServerOpts} ServerOpts
 */
