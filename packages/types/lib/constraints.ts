/**
 * A collection of constraints describing the allowed capabilities for a driver.
 */
export type Constraints = {
  readonly [name: string]: Constraint;
};

export interface Constraint {
  readonly presence?: boolean | Readonly<{allowEmpty: boolean}>;
  readonly isString?: boolean;
  readonly isNumber?: boolean;
  readonly isBoolean?: boolean;
  readonly isObject?: boolean;
  readonly isArray?: boolean;
  readonly deprecated?: boolean;
  readonly inclusion?: Readonly<[string, ...string[]]>;
  readonly inclusionCaseInsensitive?: Readonly<[string, ...string[]]>;
}

export const BASE_DESIRED_CAP_CONSTRAINTS = {
  platformName: {
    presence: true,
    isString: true,
  },
  app: {
    isString: true,
  },
  platformVersion: {
    isString: true,
  },
  webSocketUrl: {
    isBoolean: true,
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
} as const satisfies Constraints;

export type BaseDriverCapConstraints = typeof BASE_DESIRED_CAP_CONSTRAINTS;
