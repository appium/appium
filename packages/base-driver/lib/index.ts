// BaseDriver exports
export { ExtensionCore } from './basedriver/extension-core';
import { BaseDriver } from './basedriver/driver';
export { DriverCore } from './basedriver/core';
export { DeviceSettings } from './basedriver/device-settings';
export { AppiumIpc } from './basedriver/ipc';

export { BaseDriver };
export default BaseDriver;
export { DEFAULT_BASE_PATH, MAX_LOG_BODY_LENGTH, PROTOCOLS, W3C_ELEMENT_KEY } from './constants';

// MJSONWP exports
export * from './protocol';
export { errorFromMJSONWPStatusCode as errorFromCode } from './protocol';

// Express exports
/** @deprecated Removed in Appium 4. Use hard-copied test fixtures in driver CI instead. */
export { normalizeBasePath, server } from './express/server';
export { TEST_FIXTURES_DIR as STATIC_DIR } from './test-pages';

// jsonwp-proxy exports
/** @deprecated The JWProxy export is deprecated. Please use WebDriverProxy instead */
export { JWProxy } from './jsonwp-proxy/proxy';
export { JWProxy as WebDriverProxy } from './jsonwp-proxy/proxy';

// jsonwp-status exports
export { codes as statusCodes, getSummaryByCode } from './jsonwp-status/status';

// W3C capabilities parser
export {
  isStandardCap,
  PREFIXED_APPIUM_OPTS_CAP,
  processCapabilities,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
  STANDARD_CAPS,
  validateCaps,
} from './basedriver/capabilities';

// Web socket helpers
export { DEFAULT_WS_PATHNAME_PREFIX } from './express/websocket';

// BiDi exports
export { BIDI_COMMANDS } from './protocol/bidi-commands';

export { generateDriverLogPrefix } from './basedriver/helpers';

export { isW3cCaps } from './helpers/capabilities';

export type { ServerOpts } from './express/server';
