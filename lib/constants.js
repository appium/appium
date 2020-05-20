import { util } from 'appium-support';

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
};
// for historical reasons, Selenium/Appium servers often hid the entire API
// behind a /wd/hub prefix. This should be optional and indeed the server
// administrator should be able to host the API behind any prefix; but for now
// it is the default.
const DEFAULT_BASE_PATH = '/wd/hub';
const IMAGE_ELEMENT_PREFIX = 'appium-image-element-';


export {
  MAX_LOG_BODY_LENGTH, MJSONWP_ELEMENT_KEY, W3C_ELEMENT_KEY,
  PROTOCOLS, DEFAULT_BASE_PATH, IMAGE_ELEMENT_PREFIX,
};
