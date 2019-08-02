import log from './logger';
import { errors } from '../protocol';


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

function allowCrossDomainAsyncExecute (req, res, next) {
  // there are two paths for async responses, so cover both
  // https://regex101.com/r/txYiEz/1
  const receiveAsyncResponseRegExp = new RegExp(`(/wd/hub)?/session/[a-f0-9-]+/(appium/)?receive_async_response`);
  if (!receiveAsyncResponseRegExp.test(req.url)) {
    return next();
  }
  allowCrossDomain(req, res, next);
}

function fixPythonContentType (req, res, next) {
  // hack because python client library gives us wrong content-type
  if (/^\/wd/.test(req.path) && /^Python/.test(req.headers['user-agent'])) {
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      req.headers['content-type'] = 'application/json; charset=utf-8';
    }
  }
  next();
}

function defaultToJSONContentType (req, res, next) {
  if (!req.headers['content-type']) {
    req.headers['content-type'] = 'application/json; charset=utf-8';
  }
  next();
}

function catchAllHandler (err, req, res, next) {
  log.error(`Uncaught error: ${err.message}`);
  log.error('Sending generic error response');
  try {
    res.status(500).send({
      status: errors.UnknownError.code(),
      value: `ERROR running Appium command: ${err.message}`
    });
    log.error(err);
  } catch (ign) {
    next(ign);
  }
}

function catch4XXHandler (err, req, res, next) {
  if (err.status >= 400 && err.status < 500) {
    // set the content type to `text/plain`
    // https://code.google.com/p/selenium/wiki/JsonWireProtocol#Responses
    log.debug(`Setting content type to 'text/plain' for HTTP status '${err.status}'`);
    res.set('content-type', 'text/plain');
    res.status(err.status).send(`Unable to process request: ${err.message}`);
  } else {
    next(err);
  }
}

function catch404Handler (req, res) {
  // set the content type to `text/plain`
  // https://code.google.com/p/selenium/wiki/JsonWireProtocol#Responses
  log.debug('No route found. Setting content type to \'text/plain\'');
  res.set('content-type', 'text/plain');
  res.status(404).send(`The URL '${req.originalUrl}' did not map to a valid resource`);
}

export {
  allowCrossDomain, fixPythonContentType, defaultToJSONContentType,
  catchAllHandler, catch404Handler, catch4XXHandler,
  allowCrossDomainAsyncExecute,
};
