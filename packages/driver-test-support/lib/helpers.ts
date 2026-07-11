import net from 'node:net';

/**
 * Default test host
 */
export const TEST_HOST = '127.0.0.1';

let portFetchingPromise: Promise<number> | undefined;

/**
 * Returns a free port.
 * The function call is race-free and thread-safe.
 *
 * @returns A free port
 */
export async function getTestPort(): Promise<number> {
  // make sure we are not racing
  if (portFetchingPromise) {
    try {
      await portFetchingPromise;
    } catch {
      // ignore
    } finally {
      portFetchingPromise = undefined;
    }
  }

  portFetchingPromise = new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Could not resolve a free port')));
        return;
      }
      const cb = (err?: Error) => (err ? reject(err) : resolve(Number(address.port)));
      server.close(cb);
    });
  });
  return portFetchingPromise;
}

/**
 * Build Appium server URLs for tests.
 *
 * Call with `(address, port)` to get `(session, pathname) => url`, or pass all four
 * arguments at once. Use `''` when session or pathname is omitted.
 */
export function createAppiumURL(address: string, port: string | number): (session: string, pathname: string) => string;
export function createAppiumURL(address: string, port: string | number, session: string, pathname: string): string;
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
  return urlFor(session as string, pathname as string);
}
function buildAppiumURL(address: string, port: string | number, session: string, pathname: string): string {
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
