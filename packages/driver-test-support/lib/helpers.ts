import net from 'node:net';

/**
 * Default test host
 */
export const TEST_HOST = '127.0.0.1';

export interface HttpRequestOptions {
  /** HTTP method; defaults to 'GET'. */
  method?: string;
  /** Request body; JSON-stringified and sent with an `application/json` content-type. */
  data?: unknown;
  /** Additional request headers. */
  headers?: Record<string, string>;
  /**
   * Whether to throw when the response status is not 2xx (mirrors axios' default).
   * Set to `false` to inspect an error response body/status without a rejection.
   * Defaults to `true`.
   */
  throwOnError?: boolean;
}

export interface HttpResult<T = any> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

/**
 * A minimal `fetch`-based HTTP test client with axios-like ergonomics:
 * a `{status, data, headers}` result (JSON auto-parsed), and throw-by-default on non-2xx.
 *
 * Like axios, a string/Buffer `data` is sent as-is (no auto content-type); a plain
 * object/array `data` is JSON-stringified with an `application/json` content-type added
 * (unless already set).
 */
export async function httpRequest<T = any>(url: string, options: HttpRequestOptions = {}): Promise<HttpResult<T>> {
  const {method = 'GET', data, headers, throwOnError = true} = options;
  const requestHeaders: Record<string, string> = {...headers};
  const hasBody = typeof data !== 'undefined';
  const hasContentType = Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type');
  let body: string | Buffer | undefined;
  if (hasBody) {
    if (typeof data === 'string' || Buffer.isBuffer(data)) {
      body = data;
      // Mirrors axios' default `Content-Type` for a raw string/Buffer body.
      if (!hasContentType) {
        requestHeaders['content-type'] = 'application/x-www-form-urlencoded';
      }
    } else {
      body = JSON.stringify(data);
      if (!hasContentType) {
        requestHeaders['content-type'] = 'application/json';
      }
    }
  }
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body,
  });
  const responseHeaders = Object.fromEntries(response.headers.entries());
  const text = await response.text();
  let parsedData: unknown = text;
  try {
    parsedData = text ? JSON.parse(text) : text;
  } catch {
    // keep parsedData as the raw text
  }
  if (throwOnError && !response.ok) {
    throw new Error(`Request failed with status code ${response.status}`);
  }
  return {status: response.status, data: parsedData as T, headers: responseHeaders};
}

export async function httpGet<T = any>(
  url: string,
  options: Omit<HttpRequestOptions, 'method' | 'data'> = {},
): Promise<HttpResult<T>> {
  return httpRequest<T>(url, {...options, method: 'GET'});
}

export async function httpPost<T = any>(
  url: string,
  data?: unknown,
  options: Omit<HttpRequestOptions, 'method' | 'data'> = {},
): Promise<HttpResult<T>> {
  return httpRequest<T>(url, {...options, method: 'POST', data});
}

export async function httpDelete<T = any>(
  url: string,
  options: Omit<HttpRequestOptions, 'method' | 'data'> = {},
): Promise<HttpResult<T>> {
  return httpRequest<T>(url, {...options, method: 'DELETE'});
}

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
  session: string = '',
  pathname: string = '',
): string | ((session: string, pathname: string) => string) {
  const urlFor = (sess: string, path: string) => buildAppiumURL(address, port, sess, path);
  if (arguments.length === 2) {
    return urlFor;
  }
  return urlFor(session, pathname);
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
