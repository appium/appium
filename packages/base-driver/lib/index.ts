// BaseDriver exports
export {ExtensionCore} from './basedriver/extension-core.js';
import {BaseDriver} from './basedriver/driver.js';
export {DriverCore} from './basedriver/core.js';
export {DeviceSettings} from './basedriver/device-settings.js';
export {AppiumIpc} from './basedriver/ipc.js';

export {BaseDriver};
export default BaseDriver;
export {DEFAULT_BASE_PATH, MAX_LOG_BODY_LENGTH, PROTOCOLS, W3C_ELEMENT_KEY} from './constants.js';

// MJSONWP exports
export * from './protocol/index.js';
export {errorFromMJSONWPStatusCode as errorFromCode} from './protocol/index.js';

// Express exports
/** @deprecated Removed in Appium 4. Use hard-copied test fixtures in driver CI instead. */
export {normalizeBasePath, server} from './express/server.js';
export {TEST_FIXTURES_DIR as STATIC_DIR} from './test-pages/index.js';

// jsonwp-proxy exports
/** @deprecated The JWProxy export is deprecated. Please use WebDriverProxy instead */
export {JWProxy} from './jsonwp-proxy/proxy.js';
export {JWProxy as WebDriverProxy} from './jsonwp-proxy/proxy.js';

// jsonwp-status exports
export {codes as statusCodes, getSummaryByCode} from './jsonwp-status/status.js';

// W3C capabilities parser
export {
  isStandardCap,
  PREFIXED_APPIUM_OPTS_CAP,
  processCapabilities,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
  STANDARD_CAPS,
  validateCaps,
} from './basedriver/capabilities.js';

// Web socket helpers
export {DEFAULT_WS_PATHNAME_PREFIX} from './express/websocket.js';

// BiDi exports
export {BIDI_COMMANDS} from './protocol/bidi-commands.js';

export {generateDriverLogPrefix} from './basedriver/helpers.js';

export {isW3cCaps} from './helpers/capabilities.js';

export type {ServerOpts} from './express/server.js';
