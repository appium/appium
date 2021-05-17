import _ from 'lodash';
import log from './logger';
import { errors } from '../protocol';
import { handleIdempotency } from './idempotency';

function allowCrossDomain (req, res, next) {
  try {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Cache-Control, Pragma, Origin, X-Requested-With, Content-Type, Accept, User-Agent');

    // need to respond 200 to OPTIONS
    if ('OPTIONS' === req.method) {
      return res.sendStatus(200);
    }
  } catch (err) {
    log.error(`Unexpected error: ${err.stack}`);
  }
  next();
}

function allowCrossDomainAsyncExecute (basePath) {
  return (req, res, next) => {
    // there are two paths for async responses, so cover both
    // https://regex101.com/r/txYiEz/1
    const receiveAsyncResponseRegExp = new RegExp(`${_.escapeRegExp(basePath)}/session/[a-f0-9-]+/(appium/)?receive_async_response`);
    if (!receiveAsyncResponseRegExp.test(req.url)) {
      return next();
    }
    allowCrossDomain(req, res, next);
  };
}

function fixPythonContentType (basePath) {
  return (req, res, next) => {
    // hack because python client library gives us wrong content-type
    if (new RegExp(`^${_.escapeRegExp(basePath)}`).test(req.path) && /^Python/.test(req.headers['user-agent'])) {
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        req.headers['content-type'] = 'application/json; charset=utf-8';
      }
    }
    next();
  };
}

function defaultToJSONContentType (req, res, next) {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

function catchAllHandler (err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  log.error(`Uncaught error: ${err.message}`);
  log.error('Sending generic error response');
  const error = errors.UnknownError;
  res.status(error.w3cStatus()).json(patchWithSessionId(req, {
    status: error.code(),
    value: {
      error: error.error(),
      message: `An unknown server-side error occurred while processing the command: ${err.message}`,
      stacktrace: err.stack,
    }
  }));
  log.error(err);
}

function catch404Handler (req, res) {
  log.debug(`No route found for ${req.url}`);
  const error = errors.UnknownCommandError;
  res.status(error.w3cStatus()).json(patchWithSessionId(req, {
    status: error.code(),
    value: {
      error: error.error(),
      message: 'The requested resource could not be found, or a request was ' +
        'received using an HTTP method that is not supported by the mapped ' +
        'resource',
      stacktrace: '',
    }
  }));
}


const SESSION_ID_PATTERN = /\/session\/([^/]+)/;

function patchWithSessionId (req, body) {
  const match = SESSION_ID_PATTERN.exec(req.url);
  if (match) {
    body.sessionId = match[1];
  }
  return body;
}

export {
  allowCrossDomain, fixPythonContentType, defaultToJSONContentType,
  catchAllHandler, allowCrossDomainAsyncExecute, handleIdempotency,
  catch404Handler,
};
