import {util} from '@appium/support';
import {Protocol} from '@appium/types';

// The default maximum length of a single log record
// containing http request/response body
// This value could be globally customized using the --log-filters
// server feature. Example rule:
// 	{"pattern": "(.{1,150}).*", "flags": "s", "replacer": "$1"}
// ^ cuts all log records to maximum 150 chars
const MAX_LOG_BODY_LENGTH = 1024;
const MJSONWP_ELEMENT_KEY = 'ELEMENT';
const W3C_ELEMENT_KEY = util.W3C_WEB_ELEMENT_IDENTIFIER;
const PROTOCOLS = {
  W3C: 'W3C',
  MJSONWP: 'MJSONWP',
} as const satisfies Record<Protocol, Protocol>;

// Before Appium 2.0, this default value was '/wd/hub' by historical reasons.
const DEFAULT_BASE_PATH = '';

export {MAX_LOG_BODY_LENGTH, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY, PROTOCOLS, DEFAULT_BASE_PATH};
