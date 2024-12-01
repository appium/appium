import {util} from '@appium/support';
import {Protocol} from '@appium/types';

// The default maximum length of a single log record
// containing http request/response body
// This value could be globally customized using the --log-filters
// server feature. Example rule:
// 	{"pattern": "(.{1,150}).*", "flags": "s", "replacer": "$1"}
// ^ cuts all log records to maximum 150 chars
export const MAX_LOG_BODY_LENGTH = 1024;
export const MJSONWP_ELEMENT_KEY = 'ELEMENT';
export const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
export const PROTOCOLS = {
  W3C: 'W3C',
  MJSONWP: 'MJSONWP',
} as const satisfies Record<Protocol, Protocol>;

// Before Appium 2.0, this default value was '/wd/hub' by historical reasons.
export const DEFAULT_BASE_PATH = '';
