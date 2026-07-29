import type {Driver, MethodMap} from '@appium/types';

import {APPIUM_COMMANDS_ROUTES} from './commands';
import {APPIUM_DEVICE_ROUTES} from './device';
import {APPIUM_SESSION_ROUTES} from './session';
import {APPIUM_SETTINGS_ROUTES} from './settings';

/**
 * Appium-specific routes, assembled from the per-section files in this directory.
 */
export const APPIUM_ROUTES = {
  ...APPIUM_SESSION_ROUTES,
  ...APPIUM_SETTINGS_ROUTES,
  ...APPIUM_COMMANDS_ROUTES,
  ...APPIUM_DEVICE_ROUTES,
} as const satisfies MethodMap<Driver>;
