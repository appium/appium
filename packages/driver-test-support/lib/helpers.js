import getPort from 'get-port';
import {curry} from 'lodash';

/**
 * Default test host
 */
const TEST_HOST = '127.0.0.1';

let testPort;

/**
 * Returns a free port; one per process
 * @param {boolean} [force] - If true, do not reuse the port (if it already exists)
 * @returns {Promise<number>} a free port
 */
async function getTestPort(force = false) {
  if (force || !testPort) {
    let port = await getPort();
    if (!testPort) {
      testPort = port;
    }
    return port;
  }
  return testPort;
}

/**
 * Build an Appium URL from components.
 *
 * **All** parameters are required.  Provide an empty string (`''`) if you don't need one.
 * To rearrange arguments (if needed), use the placeholder from Lodash (`_`).
 *
 */
const createAppiumURL = curry(
  /**
   * @param {string} address - Base address (w/ optional protocol)
   * @param {string|number} port - Port number
   * @param {string?} session - Session ID
   * @param {string} pathname - Extra path
   * @returns {string} New URL
   * @example
   *
   * import _ from 'lodash';
   *
   * // http://127.0.0.1:31337/session
   * createAppiumURL('127.0.0.1', 31337, '', 'session')
   *
   * // http://127.0.0.1:31337/session/asdfgjkl
   * const createSessionURL = createAppiumURL('127.0.0.1', 31337, _, 'session')
   * createSessionURL('asdfgjkl')
   *
   * // http://127.0.0.1:31337/session/asdfgjkl/appium/execute
   * const createURLWithPath = createAppiumURL('127.0.0.1', 31337, 'asdfgjkl');
   * createURLWithPath('appium/execute')
   */
  (address, port, session, pathname) => {
    if (!/^https?:\/\//.test(address)) {
      address = `http://${address}`;
    }
    let path = session ? `session/${session}` : '';
    if (pathname) {
      path = `${path}/${pathname}`;
    }
    return new URL(path, `${address}:${port}`).href;
  }
);

export {TEST_HOST, getTestPort, createAppiumURL};
