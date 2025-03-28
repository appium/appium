import _ from 'lodash';
import log from './logger';
import {errors} from '../protocol';
export {handleIdempotency} from './idempotency';
import {match} from 'path-to-regexp';
import {util} from '@appium/support';
import {calcSignature} from '../helpers/session';
import {getResponseForW3CError} from '../protocol/errors';

const SESSION_ID_PATTERN = /\/session\/([^/]+)/;

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {any}
 */
export function allowCrossDomain(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
  res.header(
    'Access-Control-Allow-Headers',
    'Cache-Control, Pragma, Origin, X-Requested-With, Content-Type, Accept, User-Agent'
  );

  // need to respond 200 to OPTIONS
  if ('OPTIONS' === req.method) {
    return res.sendStatus(200);
  }
  next();
}

/**
 * @param {string} basePath
 * @returns {import('express').RequestHandler}
 */
export function allowCrossDomainAsyncExecute(basePath) {
  return (req, res, next) => {
    // there are two paths for async responses, so cover both
    // https://regex101.com/r/txYiEz/1
    const receiveAsyncResponseRegExp = new RegExp(
      `${_.escapeRegExp(basePath)}/session/[a-f0-9-]+/(appium/)?receive_async_response`
    );
    if (!receiveAsyncResponseRegExp.test(req.url)) {
      return next();
    }
    allowCrossDomain(req, res, next);
  };
}

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {any}
 */
export function handleLogContext(req, res, next) {
  const requestId = util.uuidV4();

  const sessionId = SESSION_ID_PATTERN.exec(req.url)?.[1];
  const sessionInfo = sessionId ? {sessionId, sessionSignature: calcSignature(sessionId)} : {};

  log.updateAsyncContext({requestId, ...sessionInfo}, true);

  return next();
}

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {any}
 */
export function defaultToJSONContentType(req, res, next) {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

/**
 *
 * @param {import('@appium/types').StringRecord<import('@appium/types').WSServer>} webSocketsMapping
 * @returns {import('express').RequestHandler}
 */
export function handleUpgrade(webSocketsMapping) {
  return (req, res, next) => {
    if (!req.headers?.upgrade || _.toLower(req.headers.upgrade) !== 'websocket') {
      return next();
    }
    let currentPathname;
    try {
      currentPathname = new URL(req.url ?? '').pathname;
    } catch {
      currentPathname = req.url ?? '';
    }
    for (const [pathname, wsServer] of _.toPairs(webSocketsMapping)) {
      if (match(pathname)(currentPathname)) {
        return wsServer.handleUpgrade(req, req.socket, Buffer.from(''), (ws) => {
          wsServer.emit('connection', ws, req);
        });
      }
    }
    log.info(`Did not match the websocket upgrade request at ${currentPathname} to any known route`);
    next();
  };
}

/**
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function catchAllHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  log.error(`Uncaught error: ${err.message}`);
  const error = new errors.UnknownError(err);
  error.stacktrace = err.stack;
  const [status, body] = getResponseForW3CError(error);
  res.status(status).json(body);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function catch404Handler(req, res) {
  log.debug(`No route found for ${req.url}`);
  const [status, body] = getResponseForW3CError(new errors.UnknownCommandError());
  res.status(status).json(body);
}
