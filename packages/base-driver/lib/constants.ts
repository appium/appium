import {util} from '@appium/support';
import type {Protocol} from '@appium/types';

// The default maximum length of a single log record
// containing http request/response body
// This value could be globally customized using the --log-filters
// server feature. Example rule:
// 	{"pattern": "(.{1,150}).*", "flags": "s", "replacer": "$1"}
// ^ cuts all log records to maximum 150 chars
export const MAX_LOG_BODY_LENGTH = 1024;
export const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
export const PROTOCOLS = {
  W3C: 'W3C',
  MJSONWP: 'MJSONWP',
} as const satisfies Record<Protocol, Protocol>;

// Before Appium 2.0, this default value was '/wd/hub' by historical reasons.
export const DEFAULT_BASE_PATH = '';

// Default path prefix under which drivers/plugins mount their own WebSocket handlers
// (e.g. via `AppiumServer.addWebSocketHandler`). Kept independent of the HTTP server
// implementation so drivers/plugins referencing it don't need to depend on that package.
export const DEFAULT_WS_PATHNAME_PREFIX = '/ws';

// Default values for W3C WebDriver timeouts configuration
// https://w3c.github.io/webdriver/#timeouts
export const W3C_TIMEOUTS_MS = {
  SCRIPT: 30_000,
  PAGE_LOAD: 300_000,
  IMPLICIT_WAIT: 0,
};

/**
 * Appium-specific timeout type, not part of the W3C standard.
 */
export const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;
