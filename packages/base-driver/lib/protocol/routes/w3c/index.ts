import type {Driver, MethodMap} from '@appium/types';

import {W3C_ACTIONS_ROUTES} from './actions';
import {W3C_ALERT_ROUTES} from './alert';
import {W3C_CAPTURE_ROUTES} from './capture';
import {W3C_COOKIE_ROUTES} from './cookie';
import {W3C_DEVICE_POSTURE_ROUTES} from './device-posture';
import {W3C_DOCUMENT_ROUTES} from './document';
import {W3C_ELEMENT_ROUTES} from './element';
import {W3C_FEDCM_ROUTES} from './fedcm';
import {W3C_NAVIGATION_ROUTES} from './navigation';
import {W3C_PAYMENT_ROUTES} from './payment';
import {W3C_PERMISSIONS_ROUTES} from './permissions';
import {W3C_PRESSURE_ROUTES} from './pressure';
import {W3C_PRIVACY_ROUTES} from './privacy';
import {W3C_REPORTING_ROUTES} from './reporting';
import {W3C_SENSOR_ROUTES} from './sensor';
import {W3C_SESSION_ROUTES} from './session';
import {W3C_WEBAUTHN_ROUTES} from './webauthn';
import {W3C_WINDOW_ROUTES} from './window';

/**
 * W3C routes, assembled from the per-spec files in this directory: the core
 * WebDriver spec sections plus the smaller W3C specs that WebDriver extends
 * automation to (permissions, sensors, webauthn, etc).
 * @see https://www.w3.org/TR/webdriver2/
 */
export const W3C_ROUTES = {
  ...W3C_SESSION_ROUTES,
  ...W3C_NAVIGATION_ROUTES,
  ...W3C_WINDOW_ROUTES,
  ...W3C_ELEMENT_ROUTES,
  ...W3C_DOCUMENT_ROUTES,
  ...W3C_COOKIE_ROUTES,
  ...W3C_ACTIONS_ROUTES,
  ...W3C_ALERT_ROUTES,
  ...W3C_CAPTURE_ROUTES,
  ...W3C_REPORTING_ROUTES,
  ...W3C_PERMISSIONS_ROUTES,
  ...W3C_DEVICE_POSTURE_ROUTES,
  ...W3C_SENSOR_ROUTES,
  ...W3C_WEBAUTHN_ROUTES,
  ...W3C_PAYMENT_ROUTES,
  ...W3C_FEDCM_ROUTES,
  ...W3C_PRESSURE_ROUTES,
  ...W3C_PRIVACY_ROUTES,
} as const satisfies MethodMap<Driver>;
