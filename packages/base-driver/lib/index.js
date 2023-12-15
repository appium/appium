import B from 'bluebird';

try {
  B.config({
    cancellation: true,
  });
} catch (ign) {
  // sometimes during testing this somehow gets required twice and results in an error about
  // cancellation not being able to be enabled after promise has been configured
}

// BaseDriver exports
import {BaseDriver} from './basedriver/driver';
export {DriverCore} from './basedriver/core';
export {DeviceSettings} from './basedriver/device-settings';

export {BaseDriver};
export default BaseDriver;
export {MAX_LOG_BODY_LENGTH, DEFAULT_BASE_PATH, PROTOCOLS, W3C_ELEMENT_KEY} from './constants';

// MJSONWP exports
export * from './protocol';
export {errorFromMJSONWPStatusCode as errorFromCode} from './protocol';

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
