import {AsyncLocalStorage} from 'node:async_hooks';

import type {Request} from 'express';

// Ambient channel for the raw request behind a command that would have been proxied, but was
// deferred to plugins first (see route-handler.ts). Keeps it out of the command's args list.
const proxyReqStorage = new AsyncLocalStorage<Request | undefined>();

/**
 * Runs `fn` with `req` available to `getProxyReq()` for the duration of the call.
 */
export function runWithProxyReq<T>(req: Request, fn: () => Promise<T>): Promise<T> {
  return proxyReqStorage.run(req, fn);
}

/**
 * Runs `fn` with no proxy request visible to `getProxyReq()`, even if one is already active.
 * Use this around code that might re-enter command dispatch (e.g. a plugin/default chain), so
 * that a nested command doesn't inherit and misuse the outer command's proxy request.
 */
export function withoutProxyReq<T>(fn: () => Promise<T>): Promise<T> {
  return proxyReqStorage.run(undefined, fn);
}

/**
 * Returns the request set up by the innermost `runWithProxyReq`, if one is currently active.
 */
export function getProxyReq(): Request | undefined {
  return proxyReqStorage.getStore();
}
