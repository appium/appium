// @ts-check

import _ from 'lodash';
import {util} from '@appium/support';
import {PROTOCOLS, DEFAULT_BASE_PATH} from '../constants';

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
const METHOD_MAP = /** @type {const} */ ({
  '/status': {
    GET: {command: 'getStatus'},
  },
  '/session': {
    POST: {
      command: 'createSession',
      payloadParams: {
        validate: (jsonObj) =>
          !jsonObj.capabilities &&
          !jsonObj.desiredCapabilities &&
          'we require one of "desiredCapabilities" or "capabilities" object',
        optional: ['desiredCapabilities', 'requiredCapabilities', 'capabilities'],
      },
    },
  },
  '/sessions': {
    GET: {command: 'getSessions'},
  },
  '/session/:sessionId': {
    GET: {command: 'getSession'},
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
            // MJSONWP
            if (!util.hasValue(jsonObj.type) || !util.hasValue(jsonObj.ms)) {
              return 'MJSONWP protocol requires type and ms';
            }
          }
        },
        optional: ['type', 'ms', 'script', 'pageLoad', 'implicit'],
      },
    },
  },
  '/session/:sessionId/timeouts/async_script': {
    POST: {command: 'asyncScriptTimeout', payloadParams: {required: ['ms']}, deprecated: true},
  },
  '/session/:sessionId/timeouts/implicit_wait': {
    POST: {command: 'implicitWait', payloadParams: {required: ['ms']}, deprecated: true},
  },
  // JSONWP
  '/session/:sessionId/window_handle': {
    GET: {command: 'getWindowHandle'},
  },
  // W3C
  '/session/:sessionId/window/handle': {
    GET: {command: 'getWindowHandle'},
  },
  // JSONWP
  '/session/:sessionId/window_handles': {
    GET: {command: 'getWindowHandles'},
  },
  // W3C
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
  // MJSONWP
  '/session/:sessionId/execute': {
    POST: {command: 'execute', payloadParams: {required: ['script', 'args']}},
  },
  // MJSONWP
  '/session/:sessionId/execute_async': {
    POST: {
      command: 'executeAsync',
      payloadParams: {required: ['script', 'args']},
    },
  },
  '/session/:sessionId/screenshot': {
    GET: {command: 'getScreenshot'},
  },
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
  '/session/:sessionId/window/:windowhandle/size': {
    GET: {command: 'getWindowSize', deprecated: true},
  },
  '/session/:sessionId/window/:windowhandle/position': {
    POST: {deprecated: true},
    GET: {deprecated: true},
  },
  '/session/:sessionId/window/:windowhandle/maximize': {
    POST: {command: 'maximizeWindow'},
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
    POST: {command: 'active'},
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
  '/session/:sessionId/element/:elementId/submit': {
    POST: {command: 'submit', deprecated: true},
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
  '/session/:sessionId/keys': {
    POST: {command: 'keys', payloadParams: {required: ['value']}, deprecated: true},
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
  '/session/:sessionId/element/:elementId/equals/:otherId': {
    GET: {command: 'equalsElement', deprecated: true},
  },
  '/session/:sessionId/element/:elementId/displayed': {
    GET: {command: 'elementDisplayed'},
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
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']},
    },
  },
  // w3c v2 https://www.w3.org/TR/webdriver2/#get-computed-role
  'session/:sessionId/element/:elementId/computedrole': {
    GET: {command: 'getComputedRole'},
  },
  // W3C v2  https://www.w3.org/TR/webdriver2/#get-computed-label
  'session/:sessionId/element/:elementId/computedlabel': {
    GET: {command: 'getComputedLabel'},
  },
  '/session/:sessionId/rotation': {
    GET: {command: 'getRotation'},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}},
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
    POST: {},
  },
  '/session/:sessionId/actions': {
    POST: {command: 'performActions', payloadParams: {required: ['actions']}},
    DELETE: {command: 'releaseActions'},
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
  '/session/:sessionId/location': {
    GET: {command: 'getGeoLocation'},
    POST: {command: 'setGeoLocation', payloadParams: {required: ['location']}},
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
  // Selenium 4 clients
  '/session/:sessionId/se/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  // Selenium 4 clients
  '/session/:sessionId/se/log/types': {
    GET: {command: 'getLogTypes'},
  },
  // mjsonwire, appium clients
  '/session/:sessionId/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  // mjsonwire, appium clients
  '/session/:sessionId/log/types': {
    GET: {command: 'getLogTypes'},
  },
  '/session/:sessionId/application_cache/status': {
    GET: {},
  },

  //
  // mjsonwire
  //
  '/session/:sessionId/context': {
    GET: {command: 'getCurrentContext'},
    POST: {command: 'setContext', payloadParams: {required: ['name']}},
  },
  '/session/:sessionId/contexts': {
    GET: {command: 'getContexts'},
  },
  '/session/:sessionId/element/:elementId/pageIndex': {
    GET: {command: 'getPageIndex', deprecated: true},
  },
  '/session/:sessionId/network_connection': {
    GET: {command: 'getNetworkConnection'},
    POST: {
      command: 'setNetworkConnection',
      payloadParams: {unwrap: 'parameters', required: ['type']},
    },
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
  '/session/:sessionId/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['status', 'value']},
    },
  },
  '/session/:sessionId/appium/device/shake': {
    POST: {command: 'mobileShake', deprecated: true},
  },
  '/session/:sessionId/appium/device/system_time': {
    GET: {command: 'getDeviceTime', payloadParams: {optional: ['format']}},
    POST: {command: 'getDeviceTime', payloadParams: {optional: ['format']}},
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
  //region Applications Management
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
  //endregion
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
  '/session/:sessionId/appium/settings': {
    POST: {command: 'updateSettings', payloadParams: {required: ['settings']}},
    GET: {command: 'getSettings'},
  },
  '/session/:sessionId/appium/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['response']},
      deprecated: true,
    },
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

  /*
   * The W3C spec has some changes to the wire protocol.
   * https://w3c.github.io/webdriver/webdriver-spec.html
   * Begin to add those changes here, keeping the old version
   * since clients still implement them.
   */
  // MJSONWP
  '/session/:sessionId/alert_text': {
    GET: {command: 'getAlertText'},
    POST: {
      command: 'setAlertText',
      payloadParams: SET_ALERT_TEXT_PAYLOAD_PARAMS,
    },
  },
  // MJSONWP
  '/session/:sessionId/accept_alert': {
    POST: {command: 'postAcceptAlert'},
  },
  // MJSONWP
  '/session/:sessionId/dismiss_alert': {
    POST: {command: 'postDismissAlert'},
  },
  // https://w3c.github.io/webdriver/webdriver-spec.html#user-prompts
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
  // https://w3c.github.io/webdriver/webdriver-spec.html#get-element-rect
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
  // Pre-W3C endpoint for element screenshot
  '/session/:sessionId/screenshot/:elementId': {
    GET: {command: 'getElementScreenshot'},
  },
  '/session/:sessionId/element/:elementId/screenshot': {
    GET: {command: 'getElementScreenshot'},
  },
  '/session/:sessionId/window/rect': {
    GET: {command: 'getWindowRect'},
    POST: {
      command: 'setWindowRect',
      payloadParams: {required: ['x', 'y', 'width', 'height']},
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
  '/session/:sessionId/window/new': {
    POST: {command: 'createNewWindow', payloadParams: {optional: ['type']}},
  },
  '/session/:sessionId/element/:elementId/property/:name': {
    GET: {command: 'getProperty'},
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

  // chromium devtools
  // https://chromium.googlesource.com/chromium/src/+/master/chrome/test/chromedriver/server/http_handler.cc
  '/session/:sessionId/:vendor/cdp/execute': {
    POST: {command: 'executeCdp', payloadParams: {required: ['cmd', 'params']}},
  },

  //region Webauthn
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

  //endregion
});

// driver command names
let ALL_COMMANDS = [];
for (let v of _.values(METHOD_MAP)) {
  for (let m of _.values(v)) {
    if ('command' in m && m.command) {
      ALL_COMMANDS.push(m.command);
    }
  }
}

const RE_ESCAPE = /[-[\]{}()+?.,\\^$|#\s]/g;
const RE_PARAM = /([:*])(\w+)/g;

class Route {
  constructor(route) {
    this.paramNames = [];

    let reStr = route.replace(RE_ESCAPE, '\\$&');
    reStr = reStr.replace(RE_PARAM, (_, mode, name) => {
      this.paramNames.push(name);
      return mode === ':' ? '([^/]*)' : '(.*)';
    });
    this.routeRegexp = new RegExp(`^${reStr}$`);
  }

  parse(url) {
    //if (url.indexOf('timeouts') !== -1 && this.routeRegexp.toString().indexOf('timeouts') !== -1) {
    //debugger;
    //}
    let matches = url.match(this.routeRegexp);
    if (!matches) return; // eslint-disable-line curly
    let i = 0;
    let params = {};
    while (i < this.paramNames.length) {
      const paramName = this.paramNames[i++];
      params[paramName] = matches[i];
    }
    return params;
  }
}

/**
 *
 * @param {string} endpoint
 * @param {import('@appium/types').HTTPMethod} method
 * @param {string} [basePath]
 * @returns {string|undefined}
 */
function routeToCommandName(endpoint, method, basePath = DEFAULT_BASE_PATH) {
  let dstRoute = null;

  // remove any query string
  // TODO: would this be better handled as a `URL` object?
  if (endpoint.includes('?')) {
    endpoint = endpoint.slice(0, endpoint.indexOf('?'));
  }

  const actualEndpoint =
    endpoint === '/' ? '' : _.startsWith(endpoint, '/') ? endpoint : `/${endpoint}`;

  for (let currentRoute of _.keys(METHOD_MAP)) {
    const route = new Route(`${basePath}${currentRoute}`);
    // we don't care about the actual session id for matching
    if (
      route.parse(`${basePath}/session/ignored-session-id${actualEndpoint}`) ||
      route.parse(`${basePath}${actualEndpoint}`) ||
      route.parse(actualEndpoint)
    ) {
      dstRoute = currentRoute;
      break;
    }
  }
  if (!dstRoute) return; // eslint-disable-line curly

  const methods = METHOD_MAP[dstRoute];
  method = /** @type {Uppercase<typeof method>} */ (_.toUpper(method));
  if (method in methods) {
    const dstMethod = _.get(methods, method);
    if (dstMethod.command) {
      return dstMethod.command;
    }
  }
}

// driver commands that do not require a session to already exist
const NO_SESSION_ID_COMMANDS = ['createSession', 'getStatus', 'getSessions'];

export {METHOD_MAP, ALL_COMMANDS, NO_SESSION_ID_COMMANDS, routeToCommandName};
