export const BASE_DESIRED_CAP_CONSTRAINTS = {
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
} as const;

export type BaseDriverCapConstraints = typeof BASE_DESIRED_CAP_CONSTRAINTS;
