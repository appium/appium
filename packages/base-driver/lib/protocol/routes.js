// @ts-check

import _ from 'lodash';
import {util} from '@appium/support';
import {PROTOCOLS, DEFAULT_BASE_PATH} from '../constants';
import {match} from 'path-to-regexp';
import { LRUCache } from 'lru-cache';

/** @type {LRUCache<string, string>} */
const COMMAND_NAMES_CACHE = new LRUCache({
  max: 1024,
});

const SET_ALERT_TEXT_PAYLOAD_PARAMS = {
  validate: (jsonObj) =>
    !util.hasValue(jsonObj.value) &&
    !util.hasValue(jsonObj.text) &&
    'either "text" or "value" must be set',
  optional: ['value', 'text'],
  // Prefer 'value' since it's more backward-compatible.
  makeArgs: (jsonObj) => [jsonObj.value || jsonObj.text],
};

/**
 * define the routes, mapping of HTTP methods to particular driver commands, and
 * any parameters that are expected in a request parameters can be `required` or
 * `optional`
 * @satisfies {import('@appium/types').MethodMap<import('../basedriver/driver').BaseDriver>}
 */
export const METHOD_MAP = /** @type {const} */ ({

  //
  // W3C WebDriver (and deprecated MJSONWP that will be removed in Appium 3)
  // https://www.w3.org/TR/webdriver1/
  // https://www.w3.org/TR/webdriver2/
  //
  '/status': {
    GET: {command: 'getStatus'},
  },
  '/session': {
    POST: {
      command: 'createSession',
      payloadParams: {
        // TODO: Appium 3 will accept only 'capabilities'.
        validate: (jsonObj) =>
          !jsonObj.capabilities &&
          !jsonObj.desiredCapabilities &&
          'we require one of "desiredCapabilities" or "capabilities" object',
        optional: ['desiredCapabilities', 'requiredCapabilities', 'capabilities'],
      },
    },
  },
  '/session/:sessionId': {
    GET: {command: 'getSession', deprecated: true},
    DELETE: {command: 'deleteSession'},
  },
  '/session/:sessionId/timeouts': {
    GET: {command: 'getTimeouts'}, // W3C route
    POST: {
      command: 'timeouts',
      payloadParams: {
        validate: (jsonObj, protocolName) => {
          if (protocolName === PROTOCOLS.W3C) {
            if (
              !util.hasValue(jsonObj.script) &&
              !util.hasValue(jsonObj.pageLoad) &&
              !util.hasValue(jsonObj.implicit)
            ) {
              return 'W3C protocol expects any of script, pageLoad or implicit to be set';
            }
          } else {
            // TODO: Remove in Appium 3
            if (!util.hasValue(jsonObj.type) || !util.hasValue(jsonObj.ms)) {
              return 'MJSONWP protocol requires type and ms';
            }
          }
        },
        optional: ['type', 'ms', 'script', 'pageLoad', 'implicit'],
      },
    },
  },
  '/session/:sessionId/window/handles': {
    GET: {command: 'getWindowHandles'},
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

  '/session/:sessionId/screenshot': {
    GET: {command: 'getScreenshot'},
  },
  '/session/:sessionId/frame': {
    POST: {command: 'setFrame', payloadParams: {required: ['id']}},
  },
  '/session/:sessionId/frame/parent': {
    POST: {command: 'switchToParentFrame'},
  },
  '/session/:sessionId/window': {
    GET: {command: 'getWindowHandle'},
    POST: {
      command: 'setWindow',
      payloadParams: {
        // TODO: Appium 3 will only accept 'handle'. 'name' will be ginored.
        optional: ['name', 'handle'],
        // Return both values to match W3C and JSONWP protocols
        makeArgs: (jsonObj) => {
          if (util.hasValue(jsonObj.handle) && !util.hasValue(jsonObj.name)) {
            return [jsonObj.handle, jsonObj.handle];
          }
          if (util.hasValue(jsonObj.name) && !util.hasValue(jsonObj.handle)) {
            return [jsonObj.name, jsonObj.name];
          }
          return [jsonObj.name, jsonObj.handle];
        },
        validate: (jsonObj) =>
          !util.hasValue(jsonObj.name) &&
          !util.hasValue(jsonObj.handle) &&
          'we require one of "name" or "handle" to be set',
      },
    },
    DELETE: {command: 'closeWindow'},
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
  '/session/:sessionId/window/new': {
    POST: {command: 'createNewWindow', payloadParams: {optional: ['type']}},
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
  '/session/:sessionId/source': {
    GET: {command: 'getPageSource'},
  },
  '/session/:sessionId/title': {
    GET: {command: 'title'},
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
  '/session/:sessionId/element/active': {
    GET: {command: 'active'}, // W3C: https://w3c.github.io/webdriver/webdriver-spec.html#dfn-get-active-element
    POST: {command: 'active', deprecated: true},
  },
  '/session/:sessionId/element/:elementId': {
    GET: {},
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
  '/session/:sessionId/element/:elementId/click': {
    POST: {command: 'click'},
  },
  '/session/:sessionId/element/:elementId/text': {
    GET: {command: 'getText'},
  },
  '/session/:sessionId/element/:elementId/value': {
    POST: {
      command: 'setValue',
      payloadParams: {
        validate: (jsonObj) =>
          !util.hasValue(jsonObj.value) &&
          !util.hasValue(jsonObj.text) &&
          'we require one of "text" or "value" params',
        // TODO: Appium 3 will accept only 'value'.
        optional: ['value', 'text'],
        // override the default argument constructor because of the special
        // logic here. Basically we want to accept either a value (old JSONWP)
        // or a text (new W3C) parameter, but only send one of them to the
        // command (not both). Prefer 'value' since it's more
        // backward-compatible.
        makeArgs: (jsonObj) => [jsonObj.value || jsonObj.text],
      },
    },
  },
  '/session/:sessionId/element/:elementId/name': {
    GET: {command: 'getName'},
  },
  '/session/:sessionId/element/:elementId/clear': {
    POST: {command: 'clear'},
  },
  '/session/:sessionId/element/:elementId/selected': {
    GET: {command: 'elementSelected'},
  },
  '/session/:sessionId/element/:elementId/enabled': {
    GET: {command: 'elementEnabled'},
  },
  '/session/:sessionId/element/:elementId/attribute/:name': {
    GET: {command: 'getAttribute'},
  },
  '/session/:sessionId/element/:elementId/displayed': {
    GET: {command: 'elementDisplayed'},
  },
  '/session/:sessionId/element/:elementId/shadow': {
    GET: {command: 'elementShadowRoot'},
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
  '/session/:sessionId/element/:elementId/css/:propertyName': {
    GET: {command: 'getCssProperty'},
  },
  '/session/:sessionId/element/:elementId/property/:name': {
    GET: {command: 'getProperty'},
  },
  // w3c v2 https://www.w3.org/TR/webdriver2/#get-computed-role
  'session/:sessionId/element/:elementId/computedrole': {
    GET: {command: 'getComputedRole'},
  },
  // W3C v2  https://www.w3.org/TR/webdriver2/#get-computed-label
  'session/:sessionId/element/:elementId/computedlabel': {
    GET: {command: 'getComputedLabel'},
  },
  '/session/:sessionId/actions': {
    POST: {command: 'performActions', payloadParams: {required: ['actions']}},
    DELETE: {command: 'releaseActions'},
  },
  '/session/:sessionId/alert/text': {
    GET: {command: 'getAlertText'},
    POST: {
      command: 'setAlertText',
      payloadParams: SET_ALERT_TEXT_PAYLOAD_PARAMS,
    },
  },
  '/session/:sessionId/alert/accept': {
    POST: {command: 'postAcceptAlert'},
  },
  '/session/:sessionId/alert/dismiss': {
    POST: {command: 'postDismissAlert'},
  },
  '/session/:sessionId/element/:elementId/rect': {
    GET: {command: 'getElementRect'},
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
  '/session/:sessionId/element/:elementId/screenshot': {
    GET: {command: 'getElementScreenshot'},
  },
  '/session/:sessionId/window/rect': {
    GET: {command: 'getWindowRect'},
    POST: {
      command: 'setWindowRect',
      payloadParams: {optional: ['x', 'y', 'width', 'height']},
    },
  },

  //
  // Appium specific
  //
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
  '/session/:sessionId/rotation': {
    GET: {command: 'getRotation'},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}},
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
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']}
    },
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
  '/session/:sessionId/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['status', 'value']},
      deprecated: true,
    },
  },
  '/appium/sessions': {
    GET: {command: 'getAppiumSessions'},
  },
  '/session/:sessionId/appium/capabilities': {
    GET: {command: 'getAppiumSessionCapabilities'}
  },
  '/session/:sessionId/appium/device/system_time': {
    GET: {command: 'getDeviceTime', payloadParams: {optional: ['format']}},
    POST: {command: 'getDeviceTime', payloadParams: {optional: ['format']}},
  },
  // #region Applications Management
  '/session/:sessionId/appium/device/install_app': {
    POST: {
      command: 'installApp',
      payloadParams: {
        required: ['appPath'],
        optional: ['options'],
      },
    },
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
  '/session/:sessionId/appium/device/remove_app': {
    POST: {
      command: 'removeApp',
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
  '/session/:sessionId/appium/device/app_installed': {
    POST: {
      command: 'isAppInstalled',
      payloadParams: {
        required: [['appId'], ['bundleId']],
      },
    },
  },
  '/session/:sessionId/appium/device/app_state': {
    GET: {
      command: 'queryAppState',
      payloadParams: {
        required: [['appId'], ['bundleId']],
      },
    },
    POST: {
      command: 'queryAppState',
      payloadParams: {
        required: [['appId'], ['bundleId']],
      },
      deprecated: true,
    },
  },
  // #endregion
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
  '/session/:sessionId/appium/settings': {
    POST: {command: 'updateSettings', payloadParams: {required: ['settings']}},
    GET: {command: 'getSettings'},
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
  // #region Inspector
  '/session/:sessionId/appium/commands': {
    GET: {command: 'listCommands'},
  },
  '/session/:sessionId/appium/extensions': {
    GET: {command: 'listExtensions'},
  },
  // #endregion

  //
  // 3rd party vendor/protocol support
  //
  // #region Selenium/Chromium browsers
  '/session/:sessionId/se/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  '/session/:sessionId/se/log/types': {
    GET: {command: 'getLogTypes'},
  },
  // #endregion

  // #region chromium devtools
  // https://chromium.googlesource.com/chromium/src/+/master/chrome/test/chromedriver/server/http_handler.cc
  '/session/:sessionId/:vendor/cdp/execute': {
    POST: {command: 'executeCdp', payloadParams: {required: ['cmd', 'params']}},
  },
  // #endregion

  // #region Webauthn
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
  // #endregion

  //
  // Endpoints deprecated entirely
  //
  // #region MJSONWP
  '/sessions': {
    GET: {command: 'getSessions', deprecated: true},
  },
  '/session/:sessionId/timeouts/async_script': {
    POST: {command: 'asyncScriptTimeout', payloadParams: {required: ['ms']}, deprecated: true},
  },
  '/session/:sessionId/timeouts/implicit_wait': {
    POST: {command: 'implicitWait', payloadParams: {required: ['ms']}, deprecated: true},
  },
  '/session/:sessionId/window_handle': {
    GET: {command: 'getWindowHandle', deprecated: true},
  },
  // Only 'window/handles' exists in W3C WebDriver spec.
  '/session/:sessionId/window/handle': {
    GET: {command: 'getWindowHandle', deprecated: true},
  },
  '/session/:sessionId/window_handles': {
    GET: {command: 'getWindowHandles', deprecated: true},
  },
  '/session/:sessionId/execute': {
    POST: {
      command: 'execute',
      payloadParams: {required: ['script', 'args']},
      deprecated: true
    },
  },
  '/session/:sessionId/execute_async': {
    POST: {
      command: 'executeAsync',
      payloadParams: {required: ['script', 'args']},
      deprecated: true
    },
  },
  '/session/:sessionId/window/:windowhandle/size': {
    GET: {command: 'getWindowSize', deprecated: true},
  },
  '/session/:sessionId/window/:windowhandle/position': {
    POST: {deprecated: true},
    GET: {deprecated: true},
  },
  '/session/:sessionId/window/:windowhandle/maximize': {
    POST: {command: 'maximizeWindow', deprecated: true},
  },
  '/session/:sessionId/element/:elementId/submit': {
    POST: {command: 'submit', deprecated: true},
  },
  '/session/:sessionId/keys': {
    POST: {command: 'keys', payloadParams: {required: ['value']}, deprecated: true},
  },
  '/session/:sessionId/element/:elementId/equals/:otherId': {
    GET: {command: 'equalsElement', deprecated: true},
  },
  '/session/:sessionId/element/:elementId/location': {
    GET: {command: 'getLocation', deprecated: true},
  },
  '/session/:sessionId/element/:elementId/location_in_view': {
    GET: {command: 'getLocationInView', deprecated: true},
  },
  '/session/:sessionId/element/:elementId/size': {
    GET: {command: 'getSize', deprecated: true},
  },
  '/session/:sessionId/moveto': {
    POST: {
      command: 'moveTo',
      payloadParams: {optional: ['element', 'xoffset', 'yoffset']},
      deprecated: true,
    },
  },
  '/session/:sessionId/click': {
    POST: {command: 'clickCurrent', payloadParams: {optional: ['button']}, deprecated: true},
  },
  '/session/:sessionId/buttondown': {
    POST: {command: 'buttonDown', payloadParams: {optional: ['button']}, deprecated: true},
  },
  '/session/:sessionId/buttonup': {
    POST: {command: 'buttonUp', payloadParams: {optional: ['button']}, deprecated: true},
  },
  '/session/:sessionId/doubleclick': {
    POST: {command: 'doubleClick', deprecated: true},
  },
  '/session/:sessionId/touch/click': {
    POST: {command: 'click', payloadParams: {required: ['element']}, deprecated: true},
  },
  '/session/:sessionId/touch/down': {
    POST: {command: 'touchDown', payloadParams: {required: ['x', 'y']}, deprecated: true},
  },
  '/session/:sessionId/touch/up': {
    POST: {command: 'touchUp', payloadParams: {required: ['x', 'y']}, deprecated: true},
  },
  '/session/:sessionId/touch/move': {
    POST: {command: 'touchMove', payloadParams: {required: ['x', 'y']}, deprecated: true},
  },
  '/session/:sessionId/touch/scroll': {
    POST: {deprecated: true},
  },
  '/session/:sessionId/touch/doubleclick': {
    POST: {deprecated: true},
  },
  '/session/:sessionId/touch/longclick': {
    POST: {
      command: 'touchLongClick',
      payloadParams: {required: ['elements']},
      deprecated: true,
    },
  },
  '/session/:sessionId/touch/flick': {
    POST: {
      command: 'flick',
      payloadParams: {
        optional: ['element', 'xspeed', 'yspeed', 'xoffset', 'yoffset', 'speed'],
      },
      deprecated: true,
    },
  },
  '/session/:sessionId/local_storage': {
    GET: {deprecated: true},
    POST: {deprecated: true},
    DELETE: {deprecated: true},
  },
  '/session/:sessionId/local_storage/key/:key': {
    GET: {deprecated: true},
    DELETE: {deprecated: true},
  },
  '/session/:sessionId/local_storage/size': {
    GET: {deprecated: true},
  },
  '/session/:sessionId/session_storage': {
    GET: {deprecated: true},
    POST: {deprecated: true},
    DELETE: {deprecated: true},
  },
  '/session/:sessionId/session_storage/key/:key': {
    GET: {deprecated: true},
    DELETE: {deprecated: true},
  },
  '/session/:sessionId/session_storage/size': {
    GET: {deprecated: true},
  },
  '/session/:sessionId/application_cache/status': {
    GET: {deprecated: true},
  },
  '/session/:sessionId/alert_text': {
    GET: {command: 'getAlertText', deprecated: true},
    POST: {
      command: 'setAlertText',
      payloadParams: SET_ALERT_TEXT_PAYLOAD_PARAMS,
      deprecated: true
    },
  },
  '/session/:sessionId/accept_alert': {
    POST: {command: 'postAcceptAlert', deprecated: true},
  },
  '/session/:sessionId/dismiss_alert': {
    POST: {command: 'postDismissAlert', deprecated: true},
  },
  // Pre-W3C endpoint for element screenshot
  '/session/:sessionId/screenshot/:elementId': {
    GET: {command: 'getElementScreenshot', deprecated: true},
  },
  // #endregion
  // #region Appium specific
  '/session/:sessionId/element/:elementId/pageIndex': {
    GET: {command: 'getPageIndex', deprecated: true},
  },
  '/session/:sessionId/touch/perform': {
    POST: {
      command: 'performTouch',
      payloadParams: {wrap: 'actions', required: ['actions']},
      deprecated: true,
    },
  },
  '/session/:sessionId/touch/multi/perform': {
    POST: {
      command: 'performMultiAction',
      payloadParams: {required: ['actions'], optional: ['elementId']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/shake': {
    POST: {command: 'mobileShake', deprecated: true},
  },
  '/session/:sessionId/appium/device/lock': {
    POST: {command: 'lock', payloadParams: {optional: ['seconds']}, deprecated: true},
  },
  '/session/:sessionId/appium/device/unlock': {
    POST: {command: 'unlock', deprecated: true},
  },
  '/session/:sessionId/appium/device/is_locked': {
    POST: {command: 'isLocked', deprecated: true},
  },
  '/session/:sessionId/appium/start_recording_screen': {
    POST: {
      command: 'startRecordingScreen',
      payloadParams: {optional: ['options']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/stop_recording_screen': {
    POST: {
      command: 'stopRecordingScreen',
      payloadParams: {optional: ['options']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/performanceData/types': {
    POST: {command: 'getPerformanceDataTypes', deprecated: true},
  },
  '/session/:sessionId/appium/getPerformanceData': {
    POST: {
      command: 'getPerformanceData',
      payloadParams: {
        required: ['packageName', 'dataType'],
        optional: ['dataReadTimeout'],
      },
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/press_keycode': {
    POST: {
      command: 'pressKeyCode',
      payloadParams: {required: ['keycode'], optional: ['metastate', 'flags']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/long_press_keycode': {
    POST: {
      command: 'longPressKeyCode',
      payloadParams: {required: ['keycode'], optional: ['metastate', 'flags']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/finger_print': {
    POST: {
      command: 'fingerprint',
      payloadParams: {required: ['fingerprintId']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/send_sms': {
    POST: {
      command: 'sendSMS',
      payloadParams: {required: ['phoneNumber', 'message']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/gsm_call': {
    POST: {
      command: 'gsmCall',
      payloadParams: {required: ['phoneNumber', 'action']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/gsm_signal': {
    POST: {
      command: 'gsmSignal',
      payloadParams: {required: ['signalStrength']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/gsm_voice': {
    POST: {command: 'gsmVoice', payloadParams: {required: ['state']}, deprecated: true},
  },
  '/session/:sessionId/appium/device/power_capacity': {
    POST: {command: 'powerCapacity', payloadParams: {required: ['percent']}, deprecated: true},
  },
  '/session/:sessionId/appium/device/power_ac': {
    POST: {command: 'powerAC', payloadParams: {required: ['state']}, deprecated: true},
  },
  '/session/:sessionId/appium/device/network_speed': {
    POST: {command: 'networkSpeed', payloadParams: {required: ['netspeed']}, deprecated: true},
  },
  '/session/:sessionId/appium/device/keyevent': {
    POST: {
      command: 'keyevent',
      payloadParams: {required: ['keycode'], optional: ['metastate']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/current_activity': {
    GET: {command: 'getCurrentActivity', deprecated: true},
  },
  '/session/:sessionId/appium/device/current_package': {
    GET: {command: 'getCurrentPackage', deprecated: true},
  },
  '/session/:sessionId/appium/device/toggle_airplane_mode': {
    POST: {command: 'toggleFlightMode', deprecated: true},
  },
  '/session/:sessionId/appium/device/toggle_data': {
    POST: {command: 'toggleData', deprecated: true},
  },
  '/session/:sessionId/appium/device/toggle_wifi': {
    POST: {command: 'toggleWiFi', deprecated: true},
  },
  '/session/:sessionId/appium/device/toggle_location_services': {
    POST: {command: 'toggleLocationServices', deprecated: true},
  },
  '/session/:sessionId/appium/device/open_notifications': {
    POST: {command: 'openNotifications', deprecated: true},
  },
  '/session/:sessionId/appium/device/start_activity': {
    POST: {
      command: 'startActivity',
      payloadParams: {
        required: ['appPackage', 'appActivity'],
        optional: [
          'appWaitPackage',
          'appWaitActivity',
          'intentAction',
          'intentCategory',
          'intentFlags',
          'optionalIntentArguments',
          'dontStopAppOnReset',
        ],
      },
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/system_bars': {
    GET: {command: 'getSystemBars', deprecated: true},
  },
  '/session/:sessionId/appium/device/display_density': {
    GET: {command: 'getDisplayDensity', deprecated: true},
  },
  '/session/:sessionId/appium/simulator/touch_id': {
    POST: {command: 'touchId', payloadParams: {required: ['match']}, deprecated: true},
  },
  '/session/:sessionId/appium/simulator/toggle_touch_id_enrollment': {
    POST: {
      command: 'toggleEnrollTouchId',
      payloadParams: {optional: ['enabled']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/app/launch': {
    POST: {command: 'launchApp', deprecated: true},
  },
  '/session/:sessionId/appium/app/close': {
    POST: {command: 'closeApp', deprecated: true},
  },
  '/session/:sessionId/appium/app/reset': {
    POST: {command: 'reset', deprecated: true},
  },
  '/session/:sessionId/appium/app/background': {
    POST: {command: 'background', payloadParams: {required: ['seconds']}, deprecated: true},
  },
  '/session/:sessionId/appium/app/end_test_coverage': {
    POST: {
      command: 'endCoverage',
      payloadParams: {required: ['intent', 'path']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/app/strings': {
    POST: {
      command: 'getStrings',
      payloadParams: {optional: ['language', 'stringFile']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/element/:elementId/value': {
    POST: {
      command: 'setValueImmediate',
      payloadParams: {required: ['text']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/element/:elementId/replace_value': {
    POST: {
      command: 'replaceValue',
      payloadParams: {required: ['text']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['response']},
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/set_clipboard': {
    POST: {
      command: 'setClipboard',
      payloadParams: {
        required: ['content'],
        optional: ['contentType', 'label'],
      },
      deprecated: true,
    },
  },
  '/session/:sessionId/appium/device/get_clipboard': {
    POST: {
      command: 'getClipboard',
      payloadParams: {
        optional: ['contentType'],
      },
      deprecated: true,
    },
  },
  // #endregion
  // #region JSONWP
  '/session/:sessionId/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}, deprecated: true},
  },
  '/session/:sessionId/log/types': {
    GET: {command: 'getLogTypes', deprecated: true},
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
export const NO_SESSION_ID_COMMANDS = ['createSession', 'getStatus', 'getSessions', 'getAppiumSessions'];
