import {AsyncLocalStorage} from 'node:async_hooks';

import type {Request} from 'express';

// Ambient channel for the raw request behind a command that would have been proxied, but was
// deferred to plugins first (see route-handler.ts). Keeps it out of the command's args list.
const proxyReqStorage = new AsyncLocalStorage<Request>();

/**
 * Runs `fn` with `req` available to `getProxyReq()` for the duration of the call.
 */
export function runWithProxyReq<T>(req: Request, fn: () => Promise<T>): Promise<T> {
  return proxyReqStorage.run(req, fn);
}

/**
 * Returns the request set up by the innermost `runWithProxyReq`, if one is currently active.
 */
export function getProxyReq(): Request | undefined {
  return proxyReqStorage.getStore();
}
