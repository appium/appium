import type {Driver, MethodMap} from '@appium/types';

/**
 * Standard W3C WebDriver routes.
 * @see https://www.w3.org/TR/webdriver2/
 */
export const W3C_ROUTES = {
  // Sessions
  '/session': {
    POST: {
      command: 'createSession',
      payloadParams: {
        optional: ['capabilities'],
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

  // Timeouts
  '/session/:sessionId/timeouts': {
    GET: {command: 'getTimeouts'},
    POST: {
      command: 'timeouts',
      payloadParams: {
        optional: ['type', 'ms', 'script', 'pageLoad', 'implicit'],
      },
    },
  },

  // Navigation
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

  // Contexts (windows and frames)
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

  // Elements
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

  // Document
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

  // Cookies
  '/session/:sessionId/cookie': {
    GET: {command: 'getCookies'},
    POST: {command: 'setCookie', payloadParams: {required: ['cookie']}},
    DELETE: {command: 'deleteCookies'},
  },
  '/session/:sessionId/cookie/:name': {
    GET: {command: 'getCookie'},
    DELETE: {command: 'deleteCookie'},
  },

  // Actions
  '/session/:sessionId/actions': {
    POST: {command: 'performActions', payloadParams: {required: ['actions']}},
    DELETE: {command: 'releaseActions'},
  },

  // User prompts (alerts)
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

  // Screen capture and printing
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
        optional: ['orientation', 'scale', 'background', 'page', 'margin', 'shrinkToFit', 'pageRanges'],
      },
    },
  },
} as const satisfies MethodMap<Driver>;
