import _ from 'lodash';
import {DEFAULT_BASE_PATH} from '../constants';
import {match} from 'path-to-regexp';
import {LRUCache} from 'lru-cache';

/** @type {LRUCache<string, string>} */
const COMMAND_NAMES_CACHE = new LRUCache({
  max: 1024,
});

/**
 * define the routes, mapping of HTTP methods to particular driver commands, and
 * any parameters that are expected in a request parameters can be `required` or
 * `optional`
 * @satisfies {import('@appium/types').MethodMap<import('../basedriver/driver').BaseDriver>}
 */
export const METHOD_MAP = /** @type {const} */ ({

  // #region W3C WebDriver
  // https://www.w3.org/TR/webdriver2/
  '/session': {
    POST: {
      command: 'createSession',
      payloadParams: {
        optional: ['capabilities', 'capabilities', 'capabilities'],
      },
    },
  },
  '/session/:sessionId': {
    // TODO: JSONWP route, remove in the future
    GET: {command: 'getSession', deprecated: true},
    DELETE: {command: 'deleteSession'},
  },
  '/status': {
    GET: {command: 'getStatus'},
  },
  '/session/:sessionId/timeouts': {
    GET: {command: 'getTimeouts'},
    POST: {
      command: 'timeouts',
      payloadParams: {
        optional: ['type', 'ms', 'script', 'pageLoad', 'implicit'],
      },
    },
  },
  '/session/:sessionId/url': {
    GET: {command: 'getUrl'},
    POST: {command: 'setUrl', payloadParams: {required: ['url']}},
  },
  '/session/:sessionId/forward': {
    POST: {command: 'forward'},
  },
  '/session/:sessionId/back': {
    POST: {command: 'back'},
  },
  '/session/:sessionId/refresh': {
    POST: {command: 'refresh'},
  },
  '/session/:sessionId/title': {
    GET: {command: 'title'},
  },
  '/session/:sessionId/window': {
    GET: {command: 'getWindowHandle'},
    POST: {
      command: 'setWindow',
      payloadParams: {
        required: ['handle'],
      },
    },
    DELETE: {command: 'closeWindow'},
  },
  '/session/:sessionId/window/handles': {
    GET: {command: 'getWindowHandles'},
  },
  '/session/:sessionId/window/new': {
    POST: {command: 'createNewWindow', payloadParams: {optional: ['type']}},
  },
  '/session/:sessionId/frame': {
    POST: {command: 'setFrame', payloadParams: {required: ['id']}},
  },
  '/session/:sessionId/frame/parent': {
    POST: {command: 'switchToParentFrame'},
  },
  '/session/:sessionId/window/rect': {
    GET: {command: 'getWindowRect'},
    POST: {
      command: 'setWindowRect',
      payloadParams: {optional: ['x', 'y', 'width', 'height']},
    },
  },
  '/session/:sessionId/window/maximize': {
    POST: {command: 'maximizeWindow'},
  },
  '/session/:sessionId/window/minimize': {
    POST: {command: 'minimizeWindow'},
  },
  '/session/:sessionId/window/fullscreen': {
    POST: {command: 'fullScreenWindow'},
  },
  '/session/:sessionId/element/active': {
    GET: {command: 'active'},
  },
  '/session/:sessionId/element/:elementId/shadow': {
    GET: {command: 'elementShadowRoot'},
  },
  '/session/:sessionId/element': {
    POST: {
      command: 'findElement',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/elements': {
    POST: {
      command: 'findElements',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/element/:elementId/element': {
    POST: {
      command: 'findElementFromElement',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/element/:elementId/elements': {
    POST: {
      command: 'findElementsFromElement',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/shadow/:shadowId/element': {
    POST: {
      command: 'findElementFromShadowRoot',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/shadow/:shadowId/elements': {
    POST: {
      command: 'findElementsFromShadowRoot',
      payloadParams: {required: ['using', 'value']},
    },
  },
  '/session/:sessionId/element/:elementId/selected': {
    GET: {command: 'elementSelected'},
  },
  '/session/:sessionId/element/:elementId/displayed': {
    GET: {command: 'elementDisplayed'},
  },
  '/session/:sessionId/element/:elementId/attribute/:name': {
    GET: {command: 'getAttribute'},
  },
  '/session/:sessionId/element/:elementId/property/:name': {
    GET: {command: 'getProperty'},
  },
  '/session/:sessionId/element/:elementId/css/:propertyName': {
    GET: {command: 'getCssProperty'},
  },
  '/session/:sessionId/element/:elementId/text': {
    GET: {command: 'getText'},
  },
  '/session/:sessionId/element/:elementId/name': {
    GET: {command: 'getName'},
  },
  '/session/:sessionId/element/:elementId/rect': {
    GET: {command: 'getElementRect'},
  },
  '/session/:sessionId/element/:elementId/enabled': {
    GET: {command: 'elementEnabled'},
  },
  '/session/:sessionId/element/:elementId/computedrole': {
    GET: {command: 'getComputedRole'},
  },
  '/session/:sessionId/element/:elementId/computedlabel': {
    GET: {command: 'getComputedLabel'},
  },
  '/session/:sessionId/element/:elementId/click': {
    POST: {command: 'click'},
  },
  '/session/:sessionId/element/:elementId/clear': {
    POST: {command: 'clear'},
  },
  '/session/:sessionId/element/:elementId/value': {
    POST: {
      command: 'setValue',
      payloadParams: {
        required: ['text'],
      },
    },
  },
  '/session/:sessionId/source': {
    GET: {command: 'getPageSource'},
  },
  '/session/:sessionId/execute/sync': {
    POST: {command: 'execute', payloadParams: {required: ['script', 'args']}},
  },
  '/session/:sessionId/execute/async': {
    POST: {
      command: 'executeAsync',
      payloadParams: {required: ['script', 'args']},
    },
  },
  '/session/:sessionId/cookie': {
    GET: {command: 'getCookies'},
    POST: {command: 'setCookie', payloadParams: {required: ['cookie']}},
    DELETE: {command: 'deleteCookies'},
  },
  '/session/:sessionId/cookie/:name': {
    GET: {command: 'getCookie'},
    DELETE: {command: 'deleteCookie'},
  },
  '/session/:sessionId/actions': {
    POST: {command: 'performActions', payloadParams: {required: ['actions']}},
    DELETE: {command: 'releaseActions'},
  },
  '/session/:sessionId/alert/dismiss': {
    POST: {command: 'postDismissAlert'},
  },
  '/session/:sessionId/alert/accept': {
    POST: {command: 'postAcceptAlert'},
  },
  '/session/:sessionId/alert/text': {
    GET: {command: 'getAlertText'},
    POST: {
      command: 'setAlertText',
      payloadParams: {
        required: ['text'],
      },
    },
  },
  '/session/:sessionId/screenshot': {
    GET: {command: 'getScreenshot'},
  },
  '/session/:sessionId/element/:elementId/screenshot': {
    GET: {command: 'getElementScreenshot'},
  },
  '/session/:sessionId/print': {
    POST: {
      command: 'printPage',
      payloadParams: {
        optional: [
          'orientation',
          'scale',
          'background',
          'page',
          'margin',
          'shrinkToFit',
          'pageRanges',
        ],
      }
    }
  },
  // #endregion

  // #region JSONWP
  // https://www.selenium.dev/documentation/legacy/json_wire_protocol/
  '/session/:sessionId/ime/available_engines': {
    GET: {command: 'availableIMEEngines', deprecated: true},
  },
  '/session/:sessionId/ime/active_engine': {
    GET: {command: 'getActiveIMEEngine', deprecated: true},
  },
  '/session/:sessionId/ime/activated': {
    GET: {command: 'isIMEActivated', deprecated: true},
  },
  '/session/:sessionId/ime/deactivate': {
    POST: {command: 'deactivateIMEEngine', deprecated: true},
  },
  '/session/:sessionId/ime/activate': {
    POST: {
      command: 'activateIMEEngine',
      payloadParams: {required: ['engine']},
      deprecated: true,
    },
  },
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']}
    },
  },
  '/session/:sessionId/location': {
    GET: {
      command: 'getGeoLocation',
      deprecated: true,
    },
    POST: {
      command: 'setGeoLocation',
      payloadParams: {required: ['location']},
      deprecated: true,
    },
  },
  // #endregion

  // #region MJSONWP
  // https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md
  '/session/:sessionId/rotation': {
    GET: {command: 'getRotation'},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}},
  },
  '/session/:sessionId/context': {
    GET: {command: 'getCurrentContext'},
    POST: {command: 'setContext', payloadParams: {required: ['name']}},
  },
  '/session/:sessionId/contexts': {
    GET: {command: 'getContexts'},
  },
  '/session/:sessionId/network_connection': {
    GET: {command: 'getNetworkConnection', deprecated: true},
    POST: {
      command: 'setNetworkConnection',
      payloadParams: {unwrap: 'parameters', required: ['type']},
      deprecated: true,
    },
  },
  // #endregion

  // #region Appium
  '/appium/sessions': {
    GET: {command: 'getAppiumSessions'},
  },
  '/session/:sessionId/appium/capabilities': {
    GET: {command: 'getAppiumSessionCapabilities'}
  },
  '/session/:sessionId/appium/settings': {
    POST: {command: 'updateSettings', payloadParams: {required: ['settings']}},
    GET: {command: 'getSettings'},
  },
  '/session/:sessionId/appium/commands': {
    GET: {command: 'listCommands'},
  },
  '/session/:sessionId/appium/extensions': {
    GET: {command: 'listExtensions'},
  },
  '/session/:sessionId/appium/events': {
    POST: {command: 'getLogEvents', payloadParams: {optional: ['type']}},
  },
  '/session/:sessionId/appium/log_event': {
    POST: {
      command: 'logCustomEvent',
      payloadParams: {required: ['vendor', 'event']},
    },
  },
  '/session/:sessionId/appium/device/system_time': {
    GET: {command: 'getDeviceTime'},
    POST: {command: 'getDeviceTime', payloadParams: {optional: ['format']}},
  },
  '/session/:sessionId/appium/device/activate_app': {
    POST: {
      command: 'activateApp',
      payloadParams: {
        required: [['appId'], ['bundleId']],
        optional: ['options'],
      },
    },
  },
  '/session/:sessionId/appium/device/terminate_app': {
    POST: {
      command: 'terminateApp',
      payloadParams: {
        required: [['appId'], ['bundleId']],
        optional: ['options'],
      },
    },
  },
  '/session/:sessionId/appium/device/app_state': {
    POST: {
      command: 'queryAppState',
      payloadParams: {
        required: [['appId'], ['bundleId']],
      },
    },
  },
  '/session/:sessionId/appium/device/install_app': {
    POST: {
      command: 'installApp',
      payloadParams: {
        required: ['appPath'],
        optional: ['options'],
      },
    },
  },
  '/session/:sessionId/appium/device/remove_app': {
    POST: {
      command: 'removeApp',
      payloadParams: {
        required: [['appId'], ['bundleId']],
        optional: ['options'],
      },
    },
  },
  '/session/:sessionId/appium/device/app_installed': {
    POST: {
      command: 'isAppInstalled',
      payloadParams: {
        required: [['appId'], ['bundleId']],
      },
    },
  },
  '/session/:sessionId/appium/device/hide_keyboard': {
    POST: {
      command: 'hideKeyboard',
      payloadParams: {optional: ['strategy', 'key', 'keyCode', 'keyName']},
    },
  },
  '/session/:sessionId/appium/device/is_keyboard_shown': {
    GET: {command: 'isKeyboardShown'},
  },
  '/session/:sessionId/appium/device/push_file': {
    POST: {command: 'pushFile', payloadParams: {required: ['path', 'data']}},
  },
  '/session/:sessionId/appium/device/pull_file': {
    POST: {command: 'pullFile', payloadParams: {required: ['path']}},
  },
  '/session/:sessionId/appium/device/pull_folder': {
    POST: {command: 'pullFolder', payloadParams: {required: ['path']}},
  },
  // #endregion

  // #region Unknown
  '/session/:sessionId/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['status', 'value']},
      deprecated: true,
    },
  },
  '/session/:sessionId/element/:elementId': {
    GET: {},
  },
  // #endregion

  // #region Other Protocols
  // Selenium/Chromium browsers
  '/session/:sessionId/se/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  '/session/:sessionId/se/log/types': {
    GET: {command: 'getLogTypes'},
  },
  // Chromium devtools
  // https://chromium.googlesource.com/chromium/src/+/master/chrome/test/chromedriver/server/http_handler.cc
  '/session/:sessionId/:vendor/cdp/execute': {
    POST: {command: 'executeCdp', payloadParams: {required: ['cmd', 'params']}},
  },
  // Reporting
  // https://www.w3.org/TR/reporting-1/
  '/session/:sessionId/reporting/generate_test_report': {
    POST: {
      command: 'generateTestReport',
      payloadParams: {required: ['message'], optional: ['group']},
    },
  },
  // Permissions
  // https://www.w3.org/TR/permissions/
  '/session/:sessionId/permissions': {
    POST: {command: 'setPermissions', payloadParams: {required: ['descriptor', 'state']}},
  },
  // Device Posture
  // https://www.w3.org/TR/device-posture/
  '/session/:sessionId/deviceposture': {
    POST: {command: 'setDevicePosture', payloadParams: {required: ['posture']}},
    DELETE: {command: 'clearDevicePosture'},
  },
  // Generic Sensor
  // https://www.w3.org/TR/generic-sensor/
  '/session/:sessionId/sensor': {
    POST: {
      command: 'createVirtualSensor',
      payloadParams: {
        required: ['type'],
        optional: ['connected', 'maxSamplingFrequency', 'minSamplingFrequency'],
      },
    },
  },
  '/session/:sessionId/sensors/:sensorType': {
    GET: {command: 'getVirtualSensorInfo'},
    POST: {command: 'updateVirtualSensorReading', payloadParams: {required: ['reading']}},
    DELETE: {command: 'deleteVirtualSensor'},
  },
  // Custom Handlers
  // https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation
  '/session/:sessionId/custom-handlers/set-mode': {
    POST: {command: 'setRPHRegistrationMode', payloadParams: {required: ['mode']}},
  },
  // Webauthn
  // https://www.w3.org/TR/webauthn-2/#sctn-automation-add-virtual-authenticator
  '/session/:sessionId/webauthn/authenticator': {
    POST: {
      command: 'addVirtualAuthenticator',
      payloadParams: {
        required: ['protocol', 'transport'],
        optional: ['hasResidentKey', 'hasUserVerification', 'isUserConsenting', 'isUserVerified'],
      },
    },
  },
  '/session/:sessionId/webauthn/authenticator/:authenticatorId': {
    DELETE: {
      command: 'removeVirtualAuthenticator',
    },
  },
  '/session/:sessionId/webauthn/authenticator/:authenticatorId/credential': {
    POST: {
      command: 'addAuthCredential',
      payloadParams: {
        required: ['credentialId', 'isResidentCredential', 'rpId', 'privateKey'],
        optional: ['userHandle', 'signCount'],
      },
    },
  },
  '/session/:sessionId/webauthn/authenticator/:authenticatorId/credentials': {
    GET: {command: 'getAuthCredential'},
    DELETE: {command: 'removeAllAuthCredentials'},
  },
  '/session/:sessionId/webauthn/authenticator/:authenticatorId/credentials/:credentialId': {
    DELETE: {command: 'removeAuthCredential'},
  },
  '/session/:sessionId/webauthn/authenticator/:authenticatorId/uv': {
    POST: {
      command: 'setUserAuthVerified',
      payloadParams: {
        required: ['isUserVerified'],
      },
    },
  },
  // Secure Payment Confirmation
  // https://www.w3.org/TR/secure-payment-confirmation/
  '/session/:sessionId/secure-payment-confirmation/set-mode': {
    POST: {command: 'setSPCTransactionMode', payloadParams: {required: ['mode']}},
  },
  // Federated Credential Management
  // https://www.w3.org/TR/fedcm-1/
  '/session/:sessionId/fedcm/canceldialog': {
    POST: {command: 'fedCMCancelDialog'},
  },
  '/session/:sessionId/fedcm/selectaccount': {
    POST: {command: 'fedCMSelectAccount', payloadParams: {required: ['accountIndex']}},
  },
  '/session/:sessionId/fedcm/clickdialogbutton': {
    POST: {command: 'fedCMClickDialogButton', payloadParams: {required: ['dialogButton']}},
  },
  '/session/:sessionId/fedcm/accountlist': {
    GET: {command: 'fedCMGetAccounts'},
  },
  '/session/:sessionId/fedcm/gettitle': {
    GET: {command: 'fedCMGetTitle'},
  },
  '/session/:sessionId/fedcm/getdialogtype': {
    GET: {command: 'fedCMGetDialogType'},
  },
  '/session/:sessionId/fedcm/setdelayenabled': {
    POST: {command: 'fedCMSetDelayEnabled', payloadParams: {required: ['enabled']}},
  },
  '/session/:sessionId/fedcm/resetcooldown': {
    POST: {command: 'fedCMResetCooldown'},
  },
  // Compute Pressure
  // https://www.w3.org/TR/compute-pressure/
  '/session/:sessionId/pressuresource': {
    POST: {
      command: 'createVirtualPressureSource',
      payloadParams: {required: ['type'], optional: ['supported']},
    },
  },
  '/session/:sessionId/pressuresource/:pressureSourceType': {
    POST: {command: 'updateVirtualPressureSource', payloadParams: {required: ['sample']}},
    DELETE: {command: 'deleteVirtualPressureSource'},
  },
  // #endregion
});

// driver command names
export const ALL_COMMANDS = _.flatMap(_.values(METHOD_MAP).map(_.values))
  .filter((m) => Boolean(m.command))
  .map((m) => m.command);

/**
 *
 * @param {string} endpoint
 * @param {import('@appium/types').HTTPMethod} [method]
 * @param {string} [basePath=DEFAULT_BASE_PATH]
 * @returns {string|undefined}
 */
export function routeToCommandName(endpoint, method, basePath = DEFAULT_BASE_PATH) {
  let normalizedEndpoint = basePath
    ? endpoint.replace(new RegExp(`^${_.escapeRegExp(basePath)}`), '')
    : endpoint;
  normalizedEndpoint = `${_.startsWith(normalizedEndpoint, '/') ? '' : '/'}${normalizedEndpoint}`;
  /** @type {string} */
  let normalizedPathname;
  try {
    // we could use any prefix there as we anyway need to only extract the pathname
    normalizedPathname = new URL(`https://appium.io${normalizedEndpoint}`).pathname;
  } catch (err) {
    throw new Error(`'${endpoint}' cannot be translated to a command name: ${err.message}`);
  }

  const normalizedMethod = _.toUpper(method);
  const cacheKey = toCommandNameCacheKey(normalizedPathname, normalizedMethod);
  if (COMMAND_NAMES_CACHE.has(cacheKey)) {
    return COMMAND_NAMES_CACHE.get(cacheKey) || undefined;
  }

  /** @type {string[]} */
  const possiblePathnames = [];
  if (!normalizedPathname.startsWith('/session/')) {
    possiblePathnames.push(`/session/any-session-id${normalizedPathname}`);
  }
  possiblePathnames.push(normalizedPathname);
  for (const [routePath, routeSpec] of _.toPairs(METHOD_MAP)) {
    const routeMatcher = match(routePath);
    if (possiblePathnames.some((pp) => routeMatcher(pp))) {
      const commandForAnyMethod = () => _.first(
        (_.keys(routeSpec) ?? []).map((key) => routeSpec[key]?.command)
      );
      const commandName = normalizedMethod
        ? routeSpec?.[normalizedMethod]?.command
        : commandForAnyMethod();
      if (commandName) {
        COMMAND_NAMES_CACHE.set(cacheKey, commandName);
        return commandName;
      }
    }
  }
  // storing an empty string means we did not find any match for this set of arguments
  // and we want to cache this result
  COMMAND_NAMES_CACHE.set(cacheKey, '');
}

/**
 *
 * @param {string} endpoint
 * @param {string} [method]
 * @returns {string}
 */
function toCommandNameCacheKey(endpoint, method) {
  return `${endpoint}:${method ?? ''}`;
}

// driver commands that do not require a session to already exist
export const NO_SESSION_ID_COMMANDS = ['createSession', 'getStatus', 'getAppiumSessions'];
