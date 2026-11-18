import net from 'node:net';

import {errors, getResponseForW3CError} from '@appium/base-driver';
import type {NextFunction, Request, RequestHandler, Response} from 'express';

import {log} from '../logger.js';

/**
 * Extracts the hostname from a Host header value, handling bracketed IPv6 and ports.
 */
function hostHeaderName(host: string): string {
  let hostName = String(host);
  const bracketEnd = hostName.lastIndexOf(']');
  if (bracketEnd !== -1) {
    hostName = hostName.slice(1, bracketEnd);
  } else {
    hostName = hostName.replace(/:\d+$/, '');
  }
  return hostName.toLowerCase();
}

/**
 * Rejects requests whose Host header is neither an IP literal, a loopback name, nor one
 * of the explicitly allowed hostnames.
 *
 * An automation server without authentication is a classic DNS-rebinding target: once an
 * attacker-controlled hostname rebinds to the server's address, pages served from that
 * hostname can read and write the API same-origin. IP-literal and loopback hosts cannot
 * be rebound this way and are always allowed, as are hostnames passed in
 * `allowedHostnames` (e.g. the configured server address).
 *
 * @param allowedHostnames - Extra hostnames to accept (case-insensitive)
 * @returns Express request handler
 */
export function rejectForeignHosts(allowedHostnames: string[] = []): RequestHandler {
  const allowed = new Set(allowedHostnames.filter(Boolean).map((h) => hostHeaderName(h)));
  return function hostHeaderValidation(req: Request, res: Response, next: NextFunction): void {
    const host = req.headers.host;
    if (!host) {
      // HTTP/1.0 clients may omit Host; keep serving them.
      next();
      return;
    }
    const hostName = hostHeaderName(String(host));
    if (net.isIP(hostName) || hostName === 'localhost' || hostName.endsWith('.localhost') || allowed.has(hostName)) {
      next();
      return;
    }
    log.warn(
      `Rejected a request whose Host header '${host}' is neither an IP address, a loopback ` +
        `name, nor an allowed hostname (possible DNS rebinding)`,
    );
    // W3C defines no 403 error code, so only the body shape is W3C-compliant
    const [, body] = getResponseForW3CError(new errors.UnknownError('Invalid Host header'));
    res.status(403).json(body);
  };
}
