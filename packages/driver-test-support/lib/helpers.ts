import getPort from 'get-port';
import _ from 'lodash';

/**
 * Default test host
 */
export const TEST_HOST = '127.0.0.1';

let testPort: number | undefined;

/**
 * Returns a free port; one per process
 * @param force - If true, do not reuse the port (if it already exists)
 * @returns a free port
 */
export async function getTestPort(force = false): Promise<number> {
  if (force || !testPort) {
    const port = await getPort();
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
 */
export const createAppiumURL = _.curry(
  (address: string, port: string | number, session: string | null, pathname: string): string => {
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
