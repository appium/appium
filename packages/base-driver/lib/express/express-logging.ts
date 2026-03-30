import _ from 'lodash';
import '@colors/colors';
import morgan from 'morgan';
import type {Request, RequestHandler, Response} from 'express';
import {log} from './logger';
import {MAX_LOG_BODY_LENGTH} from '../constants';
import {logger} from '@appium/support';

/**
 * Morgan middleware that logs when the HTTP response finishes.
 * Logs method, URL, status (color-coded), response time, and content-length.
 */
export const endLogFormatter: RequestHandler = morgan(endLogFormatterHandler);

/**
 * Morgan middleware that logs when the HTTP request is received (immediate).
 * Logs method and URL; request body is truncated and passed through {@link logger.markSensitive}.
 */
export const startLogFormatter: RequestHandler = morgan(startLogFormatterHandler, {
  immediate: true,
});

// #region Private types and helpers
type MorganTokens = unknown;
type FormatFn = (tokens: MorganTokens, req: Request, res: Response) => string;

function endLogFormatterHandler(tokens: MorganTokens, req: Request, res: Response): void {
  log.info(requestEndLoggingFormat(tokens, req, res));
}

function startLogFormatterHandler(tokens: unknown, req: Request, res: Response): void {
  let reqBody = '';
  if (req.body) {
    try {
      reqBody = _.truncate(
        _.isString(req.body) ? req.body : JSON.stringify(req.body),
        {length: MAX_LOG_BODY_LENGTH}
      );
    } catch {
      // ignore
    }
  }
  log.info(
    requestStartLoggingFormat(tokens, req, res),
    logger.markSensitive(reqBody.grey)
  );
}

// Copied the morgan compile function over so that cooler formats may be configured
function compile(fmt: string): FormatFn {
  fmt = fmt.replace(/"/g, '\\"');
  fmt = fmt.replace(/:([-\w]{2,})(?:\[([^\]]+)\])?/g, function replace(_, name, arg) {
    return `"\n    + (tokens["${name}"](req, res, "${arg}") || "-") + "`;
  });
  const js = `  return "${fmt}";`;
  return new Function('tokens', 'req', 'res', js) as FormatFn;
}

function requestEndLoggingFormat(
  tokens: MorganTokens,
  req: Request,
  res: Response
): string {
  const status = res.statusCode;
  let statusStr = ':status';
  if (status >= 500) {
    statusStr = statusStr.red;
  } else if (status >= 400) {
    statusStr = statusStr.yellow;
  } else if (status >= 300) {
    statusStr = statusStr.cyan;
  } else {
    statusStr = statusStr.green;
  }
  const fn = compile(
    `${'<-- :method :url '.white}${statusStr} ${':response-time ms - :res[content-length]'.grey}`
  );
  return fn(tokens, req, res);
}

const requestStartLoggingFormat = compile(
  `${'-->'.white} ${':method'.white} ${':url'.white}`
);
// #endregion
