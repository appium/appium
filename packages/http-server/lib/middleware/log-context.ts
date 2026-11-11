import {calcSignature} from '@appium/base-driver';
import {util} from '@appium/support';
import type {NextFunction, Request, Response} from 'express';

import {log} from '../logger.js';

const SESSION_ID_PATTERN = /\/session\/([^/]+)/;

/**
 * Populates the logger's async context with request and session metadata.
 * Derives `requestId`, optional session id/signature, and `isSensitive` flag from headers/URL.
 */
export function handleLogContext(req: Request, _res: Response, next: NextFunction): void {
  const requestId = fetchHeaderValue(req, 'x-request-id') || util.uuidV4();

  const sessionId = SESSION_ID_PATTERN.exec(req.path)?.[1];
  const sessionInfo = sessionId ? {sessionId, sessionSignature: calcSignature(sessionId)} : {};
  const isSensitiveHeaderValue = fetchHeaderValue(req, 'x-appium-is-sensitive');

  log.updateAsyncContext(
    {
      requestId,
      ...sessionInfo,
      isSensitive: ['true', '1', 'yes'].includes(String(isSensitiveHeaderValue ?? '').toLowerCase()),
    },
    true,
  );

  next();
}

function fetchHeaderValue(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : (value as string | undefined);
}
