import _ from 'lodash';
import log from './logger';
import {errors} from '../protocol';
export {handleIdempotency} from './idempotency';
import {match} from 'path-to-regexp';
import {util} from '@appium/support';
import {calcSignature} from '../helpers/session';

/**
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {any}
 */
export function allowCrossDomain(req, res, next) {
  try {
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
  } catch (err) {
    log.error(`Unexpected error: ${err.stack}`);
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
 * @param {string} basePath
 * @returns {import('express').RequestHandler}
 */
export function fixPythonContentType(basePath) {
  return (req, res, next) => {
    // hack because python client library gives us wrong content-type
    if (
      new RegExp(`^${_.escapeRegExp(basePath)}`).test(req.path) &&
      (req.headers['user-agent'] ?? '').startsWith('Python')
    ) {
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        req.headers['content-type'] = 'application/json; charset=utf-8';
      }
    }
    next();
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
  const requestId = fetchHeaderValue(req, 'x-request-id') || util.uuidV4();

  const sessionId = SESSION_ID_PATTERN.exec(req.url)?.[1];
  const sessionInfo = sessionId ? {sessionId, sessionSignature: calcSignature(sessionId)} : {};
  const isSensitiveHeaderValue = fetchHeaderValue(req, 'x-appium-is-sensitive');

  log.updateAsyncContext({
    requestId,
    ...sessionInfo,
    isSensitive: ['true', '1', 'yes'].includes(_.toLower(isSensitiveHeaderValue)),
  }, true);

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
  log.error('Sending generic error response');
  const error = errors.UnknownError;
  res.status(error.w3cStatus()).json(
    patchWithSessionId(req, {
      status: error.code(),
      value: {
        error: error.error(),
        message: `An unknown server-side error occurred while processing the command: ${err.message}`,
        stacktrace: err.stack,
      },
    })
  );
  log.error(err);
}

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export function catch404Handler(req, res) {
  log.debug(`No route found for ${req.url}`);
  const error = errors.UnknownCommandError;
  res.status(error.w3cStatus()).json(
    patchWithSessionId(req, {
      status: error.code(),
      value: {
        error: error.error(),
        message:
          'The requested resource could not be found, or a request was ' +
          'received using an HTTP method that is not supported by the mapped ' +
          'resource',
        stacktrace: '',
      },
    })
  );
}

const SESSION_ID_PATTERN = /\/session\/([^/]+)/;

/**
 * @param {import('express').Request} req
 * @param {any} body
 * @returns {any}
 */
function patchWithSessionId(req, body) {
  const match = SESSION_ID_PATTERN.exec(req.url);
  if (match) {
    body.sessionId = match[1];
  }
  return body;
}

/**
 * @param {import('express').Request} req
 * @param {string} name
 * @returns {string | undefined}
 */
function fetchHeaderValue(req, name) {
  return _.isArray(req.headers[name])
    ? req.headers[name][0]
    : req.headers[name];
}
