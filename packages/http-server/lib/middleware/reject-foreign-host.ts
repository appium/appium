import net from 'node:net';

import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {NextFunction, Request, RequestHandler, Response} from 'express';

import {log} from '../logger.js';

/**
 * Extracts the hostname from a Host header value, handling bracketed IPv6 and ports.
 *
 * A bracketed value is only valid when it consists of `[<IPv6 literal>]` optionally
 * followed by `:<port>`. Anything else (an unterminated bracket, a non-IPv6 literal
 * inside the brackets, or trailing characters after the closing bracket) returns `null`,
 * so a malformed value can never shrink to a substring that matches an allowed hostname.
 */
function hostHeaderName(host: string): string | null {
  let hostName = String(host);
  if (hostName.startsWith('[')) {
    const bracketEnd = hostName.indexOf(']');
    if (bracketEnd === -1) {
      return null;
    }
    const inner = hostName.slice(1, bracketEnd);
    const suffix = hostName.slice(bracketEnd + 1);
    if (!net.isIPv6(inner) || (suffix !== '' && !/^:\d+$/.test(suffix))) {
      return null;
    }
    return inner.toLowerCase();
  }
  return hostName.replace(/:\d+$/, '').toLowerCase();
}

/**
 * Creates a predicate that decides whether a Host header value may access the server.
 *
 * An automation server without authentication is a classic DNS-rebinding target: once an
 * attacker-controlled hostname rebinds to the server's address, pages served from that
 * hostname can read and write the API same-origin. IP-literal and loopback hosts cannot
 * be rebound this way and are always allowed, as are hostnames passed in
 * `allowedHostnames` (e.g. the configured server address). Requests without a Host
 * header (HTTP/1.0 clients) are also allowed. Malformed bracketed values are rejected.
 *
 * @param allowedHostnames - Extra hostnames to accept (case-insensitive)
 * @returns Predicate over the raw `Host` header value
 */
export function createHostValidator(allowedHostnames: string[] = []): (host: string | undefined) => boolean {
  const allowed = new Set(
    allowedHostnames
      .filter(Boolean)
      .map((h) => hostHeaderName(h))
      .filter((h): h is string => h !== null),
  );
  return (host: string | undefined): boolean => {
    if (!host) {
      // HTTP/1.0 clients may omit Host; keep serving them.
      return true;
    }
    const hostName = hostHeaderName(String(host));
    if (hostName === null) {
      return false;
    }
    return Boolean(net.isIP(hostName)) || hostName === 'localhost' || hostName.endsWith('.localhost') || allowed.has(hostName);
  };
}

/**
 * The W3C error body used for every rejected Host value.
 */
export function invalidHostResponseBody(): Record<string, unknown> {
  const [, body] = getResponseForW3CError(new errors.UnknownError('Invalid Host header'));
  return body as Record<string, unknown>;
}

/**
 * Rejects requests whose Host header is neither an IP literal, a loopback name, nor one
 * of the explicitly allowed hostnames.
 *
 * @param allowedHostnames - Extra hostnames to accept (case-insensitive)
 * @returns Express request handler
 */
export function rejectForeignHosts(allowedHostnames: string[] = []): RequestHandler {
  const isAllowed = createHostValidator(allowedHostnames);
  return function hostHeaderValidation(req: Request, res: Response, next: NextFunction): void {
    if (isAllowed(req.headers.host ? String(req.headers.host) : undefined)) {
      next();
      return;
    }
    const host = String(req.headers.host);
    log.warn(
      `Rejected a request whose Host header '${host}' is neither an IP address, a loopback ` +
        `name, nor an allowed hostname (possible DNS rebinding)`,
    );
    // W3C defines no 403 error code, so only the body shape is W3C-compliant
    res.status(403).json(invalidHostResponseBody());
  };
}
