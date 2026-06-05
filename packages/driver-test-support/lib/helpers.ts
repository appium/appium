import net from 'node:net';

/**
 * Default test host
 */
export const TEST_HOST = '127.0.0.1';

async function getPort(): Promise<number> {
  const server = net.createServer();
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, TEST_HOST, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not resolve a free port')));
        return;
      }
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}

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
 * Build Appium server URLs for tests.
 *
 * Call with `(address, port)` to get `(session, pathname) => url`, or pass all four
 * arguments at once. Use `''` when session or pathname is omitted.
 */
export function createAppiumURL(
  address: string,
  port: string | number,
): (session: string, pathname: string) => string;
export function createAppiumURL(
  address: string,
  port: string | number,
  session: string,
  pathname: string,
): string;
export function createAppiumURL(
  address: string,
  port: string | number,
  session?: string,
  pathname?: string,
): string | ((session: string, pathname: string) => string) {
  const urlFor = (sess: string, path: string) => buildAppiumURL(address, port, sess, path);
  if (arguments.length === 2) {
    return urlFor;
  }
  return urlFor(session!, pathname!);
}
function buildAppiumURL(
  address: string,
  port: string | number,
  session: string,
  pathname: string,
): string {
  let base = address;
  if (!/^https?:\/\//.test(base)) {
    base = `http://${base}`;
  }
  let path = session ? `session/${session}` : '';
  if (pathname) {
    path = `${path}/${pathname}`;
  }
  return new URL(path, `${base}:${port}`).href;
}
