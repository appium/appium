import type {Driver, MethodMap} from '@appium/types';

import {CHROMIUM_CDP_ROUTES} from './chromium-cdp.js';
import {CUSTOM_HANDLERS_ROUTES} from './custom-handlers.js';
import {DEVICE_POSTURE_ROUTES} from './device-posture.js';
import {FEDCM_ROUTES} from './fedcm.js';
import {PAYMENT_ROUTES} from './payment.js';
import {PERMISSIONS_ROUTES} from './permissions.js';
import {PRESSURE_ROUTES} from './pressure.js';
import {PRIVACY_ROUTES} from './privacy.js';
import {REPORTING_ROUTES} from './reporting.js';
import {SELENIUM_ROUTES} from './selenium.js';
import {SENSOR_ROUTES} from './sensor.js';
import {STORAGE_ACCESS_ROUTES} from './storage-access.js';
import {WEBAUTHN_ROUTES} from './webauthn.js';

/**
 * Extension spec routes, one file per spec, assembled from this directory.
 * These extend automation to specs and browser-vendor features beyond the
 * core W3C WebDriver, JSONWP, MJSONWP, and Appium-specific routes.
 */
export const EXTENSION_ROUTES = {
  ...PERMISSIONS_ROUTES,
  ...DEVICE_POSTURE_ROUTES,
  ...SENSOR_ROUTES,
  ...WEBAUTHN_ROUTES,
  ...PAYMENT_ROUTES,
  ...FEDCM_ROUTES,
  ...PRESSURE_ROUTES,
  ...PRIVACY_ROUTES,
  ...REPORTING_ROUTES,
  ...SELENIUM_ROUTES,
  ...CHROMIUM_CDP_ROUTES,
  ...CUSTOM_HANDLERS_ROUTES,
  ...STORAGE_ACCESS_ROUTES,
} as const satisfies MethodMap<Driver>;
