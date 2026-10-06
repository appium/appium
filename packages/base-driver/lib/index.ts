// BaseDriver exports
export {ExtensionCore} from './basedriver/extension-core.js';
import {BaseDriver} from './basedriver/driver.js';
export {DriverCore} from './basedriver/core.js';
export {DeviceSettings} from './basedriver/device-settings.js';
export {AppiumIpc} from './basedriver/ipc.js';

export {BaseDriver};
export {
  DEFAULT_BASE_PATH,
  DEFAULT_WS_PATHNAME_PREFIX,
  MAX_LOG_BODY_LENGTH,
  NEW_COMMAND_TIMEOUT_MS,
  PROTOCOLS,
  W3C_ELEMENT_KEY,
  W3C_TIMEOUTS_MS,
} from './constants.js';

export {
  ALL_COMMANDS,
  BIDI_COMMANDS,
  CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND,
  GET_STATUS_COMMAND,
  LIST_DRIVER_COMMANDS_COMMAND,
  LIST_DRIVER_EXTENSIONS_COMMAND,
  METHOD_MAP,
  NO_SESSION_ID_COMMANDS,
  checkParams,
  errorFromW3CJsonCode,
  errors,
  getProxyReq,
  getResponseForW3CError,
  isErrorType,
  isSessionCommand,
  handleIdempotency,
  makeArgs,
  routeConfiguringFunction,
  routeToCommandName,
  runWithProxyReq,
  validateExecuteMethodParams,
  withoutProxyReq,
} from './protocol/index.js';
export type {CheckParamsOptions, RouteConfiguringFunction, RouteConfiguringFunctionOpts} from './protocol/index.js';

// wd-proxy exports
export {WebDriverProxy} from './wd-proxy/proxy.js';

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

export {isW3cCaps} from './helpers/capabilities.js';
export {generateDriverLogPrefix} from './helpers/log-prefix.js';
export {calcSignature} from './helpers/session.js';
