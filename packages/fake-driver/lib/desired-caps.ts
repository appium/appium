import type {Constraints} from '@appium/types';

export const desiredCapConstraints = {
  app: {
    presence: true,
    isString: true,
  },
  runClock: {
    isBoolean: true,
  },
} as const satisfies Constraints;

export type FakeDriverConstraints = typeof desiredCapConstraints;
