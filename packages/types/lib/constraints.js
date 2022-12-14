export const BASE_DESIRED_CAP_CONSTRAINTS = /** @type {const} */ ({
  platformName: {
    presence: true,
    isString: true,
  },
  app: {
    isString: true,
  },
  deviceName: {
    isString: true,
  },
  platformVersion: {
    isString: true,
  },
  webSocketUrl: {
    isString: true,
  },
  newCommandTimeout: {
    isNumber: true,
  },
  automationName: {
    isString: true,
  },
  autoLaunch: {
    isBoolean: true,
  },
  udid: {
    isString: true,
  },
  orientation: {
    inclusion: ['LANDSCAPE', 'PORTRAIT'],
  },
  autoWebview: {
    isBoolean: true,
  },
  noReset: {
    isBoolean: true,
  },
  fullReset: {
    isBoolean: true,
  },
  language: {
    isString: true,
  },
  locale: {
    isString: true,
  },
  eventTimings: {
    isBoolean: true,
  },
  printPageSourceOnFindFailure: {
    isBoolean: true,
  },
});

/**
 * @typedef {typeof BASE_DESIRED_CAP_CONSTRAINTS} BaseDriverCapConstraints
 */
